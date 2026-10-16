<?php
/**
 * Yol Uyarı – uygulama API'si (PHP 7.4+ / 8.x, SQLite veya MySQL)
 *
 *   GET  api/?action=ping
 *   GET  api/?action=config                         uygulama ayarları (yönetici panelinden)
 *   GET  api/?action=hazards&lat=..&lng=..&radius=..
 *   GET  api/?action=messages&after=ID&lat=..&lng=..  duyurular
 *   POST api/?action=report   {type, subtype, lat, lng, heading, speedLimit, note}
 *   POST api/?action=vote     {id, value: 1 | -1}
 *   İstekler X-Device-Id başlığı taşır (uygulama her cihaz için rastgele üretir).
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Device-Id');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

function device_id(bool $required): ?string {
    $d = (string) ($_SERVER['HTTP_X_DEVICE_ID'] ?? '');
    if (preg_match('/^[A-Za-z0-9_-]{8,64}$/', $d)) return $d;
    if ($required) fail('Geçersiz cihaz kimliği', 401);
    return null;
}
function require_not_banned(array $dev): void {
    if ((int) ($dev['banned'] ?? 0) === 1) fail('Bu cihaz yönetici tarafından engellendi.', 403);
}

function do_vote(PDO $db, int $id, string $dev, int $val, bool $silentIfVoted): void {
    $st = $db->prepare('SELECT type FROM hazards WHERE id = ?');
    $st->execute([$id]);
    $type = $st->fetchColumn();
    if (!$type) fail('Nokta bulunamadı', 404);
    $st = $db->prepare('SELECT COUNT(*) FROM votes WHERE (device = ? OR ip = ?) AND at > ?');
    $st->execute([$dev, client_ip(), nowMs() - 3600000]);
    if ((int) $st->fetchColumn() >= (int) setting('votes_per_hour')) fail('Çok fazla oy. Biraz sonra tekrar dene.', 429);
    $db->beginTransaction();
    try {
        $db->prepare('INSERT INTO votes (hazard_id, device, value, at, ip) VALUES (?,?,?,?,?)')
            ->execute([$id, $dev, $val, nowMs(), client_ip()]);
    } catch (PDOException $e) {
        $db->rollBack();
        if ($silentIfVoted) return;
        fail('Bu nokta için zaten oy verdin', 409);
    }
    $col = $val === 1 ? 'confirmations' : 'denials';
    $ttl = ttl_hours((string) $type);
    if ($val === 1 && $ttl) {
        $db->prepare("UPDATE hazards SET $col = $col + 1, expires_at = ? WHERE id = ?")->execute([nowMs() + (int) ($ttl * 3600000), $id]);
    } else {
        $db->prepare("UPDATE hazards SET $col = $col + 1 WHERE id = ?")->execute([$id]);
    }
    $db->prepare('UPDATE devices SET votes = votes + 1 WHERE id = ?')->execute([$dev]);
    $db->commit();
}

$action = (string) ($_GET['action'] ?? '');
try {
    switch ($action) {
        case 'ping':
            db();
            json_out(['ok' => true, 'app' => 'yol-uyari', 'version' => 2]);

        case 'config': {
            $out = [];
            foreach (PUBLIC_SETTINGS as $k) $out[$k] = setting($k);
            json_out($out);
        }

        case 'hazards': {
            $lat = num_in($_GET['lat'] ?? null, -90, 90, 'Enlem');
            $lng = num_in($_GET['lng'] ?? null, -180, 180, 'Boylam');
            $r = num_in($_GET['radius'] ?? 8000, 100, 50000, 'Yarıçap') ?? 8000;
            if ($lat === null || $lng === null) fail('lat ve lng gerekli');
            $db = db(); cleanup();
            $dev = device_id(false);
            if ($dev) touch_device($dev, $lat, $lng);
            $dLat = $r / 111320; $dLng = $r / (111320 * max(0.01, cos(deg2rad($lat))));
            $hide = (int) setting('hide_after');
            $st = $db->prepare("SELECT *, (reporter = ?) AS mine FROM hazards
                WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
                AND (expires_at IS NULL OR expires_at > ?) AND (source = 'official' OR denials - confirmations < ?)
                ORDER BY id DESC LIMIT 1500");
            $st->execute([$dev ?? '', $lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng, nowMs(), $hide]);
            json_out(array_map(fn($r) => hazard_out($r) + ['mine' => (bool) $r['mine']], $st->fetchAll()));
        }

        case 'messages': {
            $after = (int) ($_GET['after'] ?? 0);
            $lat = num_in($_GET['lat'] ?? null, -90, 90, 'Enlem');
            $lng = num_in($_GET['lng'] ?? null, -180, 180, 'Boylam');
            $now = nowMs();
            $st = db()->prepare('SELECT * FROM messages WHERE id > ? AND created_at > ? AND (expires_at IS NULL OR expires_at > ?) ORDER BY id LIMIT 20');
            $st->execute([$after, $now - 2 * 86400000, $now]);
            $out = [];
            foreach ($st->fetchAll() as $m) {
                if ($m['radius_km'] !== null && $m['lat'] !== null) {
                    if ($lat === null || $lng === null) continue;
                    if (haversine_km($lat, $lng, (float) $m['lat'], (float) $m['lng']) > (float) $m['radius_km']) continue;
                }
                $out[] = ['id' => (int) $m['id'], 'title' => $m['title'], 'body' => $m['body'], 'level' => $m['level'], 'createdAt' => (int) $m['created_at']];
            }
            json_out($out);
        }

        case 'samples': {
            // Uygulamadan gelen anonim hız örnekleri: [[lat, lng, kmh, yön, zaman_ms], ...]
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST gerekli', 405);
            if (!setting('traffic_enabled')) json_out(['ok' => true, 'stored' => 0]);
            $dev = device_id(true); $b = json_body(); $db = db();
            require_not_banned(touch_device($dev));
            $rows = array_slice((array) ($b['s'] ?? []), 0, 40);
            $now = nowMs(); $n = 0; $my = is_mysql($db);
            $ins = $db->prepare('INSERT INTO speed_samples (cell, hb, speed, lat, lng, at) VALUES (?,?,?,?,?,?)');
            $up = $db->prepare($my
                ? 'INSERT INTO cell_ref (cell, hb, ref, n) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE ref = GREATEST(ref * 0.997, VALUES(ref)), n = n + 1'
                : 'INSERT INTO cell_ref (cell, hb, ref, n) VALUES (?,?,?,1) ON CONFLICT(cell, hb) DO UPDATE SET ref = MAX(ref * 0.997, excluded.ref), n = n + 1');
            $db->beginTransaction();
            foreach ($rows as $r) {
                if (!is_array($r) || count($r) < 5) continue;
                [$lat, $lng, $v, $hd, $t] = array_map('floatval', array_slice($r, 0, 5));
                if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || $v < 0 || $v > 250 || $hd < 0 || $hd > 360) continue;
                if ($t < $now - 15 * 60000 || $t > $now + 60000) continue;
                $cell = geohash($lat, $lng, 7); $hb = ((int) round($hd / 45)) % 8;
                $ins->execute([$cell, $hb, $v, $lat, $lng, (int) $t]);
                $up->execute([$cell, $hb, $v]);
                $n++;
            }
            $db->commit();
            json_out(['ok' => true, 'stored' => $n]);
        }

        case 'traffic': {
            // Son 10 dakikanın hücre bazlı ortalama hızı ve yoğunluk düzeyi (0 akıcı, 1 yoğun, 2 çok yoğun)
            if (!setting('traffic_enabled')) json_out([]);
            $b = array_map('floatval', explode(',', (string) ($_GET['bbox'] ?? '')));
            if (count($b) !== 4 || abs($b[2] - $b[0]) > 1.5 || abs($b[3] - $b[1]) > 2) fail('Geçersiz ya da çok büyük alan');
            $db = db();
            $st = $db->prepare('SELECT s.cell, s.hb, AVG(s.speed) v, COUNT(*) c, AVG(s.lat) lat, AVG(s.lng) lng, MAX(r.ref) ref, MAX(r.n) rn
                FROM speed_samples s LEFT JOIN cell_ref r ON r.cell = s.cell AND r.hb = s.hb
                WHERE s.at > ? AND s.lat BETWEEN ? AND ? AND s.lng BETWEEN ? AND ?
                GROUP BY s.cell, s.hb LIMIT 3000');
            $st->execute([nowMs() - 10 * 60000, $b[0], $b[2], $b[1], $b[3]]);
            $out = [];
            foreach ($st->fetchAll() as $r) {
                $v = (float) $r['v']; $ref = (float) ($r['ref'] ?? 0);
                if ((int) ($r['rn'] ?? 0) >= 8 && $ref >= 20) { $ratio = $v / $ref; $l = $ratio >= 0.65 ? 0 : ($ratio >= 0.35 ? 1 : 2); }
                else { $l = $v >= 40 ? 0 : ($v >= 18 ? 1 : 2); }
                $out[] = ['lat' => round((float) $r['lat'], 5), 'lng' => round((float) $r['lng'], 5), 'h' => (int) $r['hb'] * 45,
                    'v' => (int) round($v), 'l' => $l, 'n' => (int) $r['c']];
            }
            json_out($out);
        }

        case 'report': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST gerekli', 405);
            if (!setting('reporting_enabled')) fail('Bildirim şu an yönetici tarafından kapatıldı.', 403);
            $dev = device_id(true); $b = json_body(); $db = db();
            require_not_banned(touch_device($dev));
            $type = (string) ($b['type'] ?? '');
            if (!in_array($type, TYPES, true) || !in_array($type, (array) setting('report_types'), true)) fail('Bu tür bildirilemiyor');
            $sub = $b['subtype'] ?? null;
            if ($sub !== null && !in_array($sub, SUBTYPES, true)) fail('Geçersiz alt tür');
            $lat = num_in($b['lat'] ?? null, -90, 90, 'Enlem'); $lng = num_in($b['lng'] ?? null, -180, 180, 'Boylam');
            if ($lat === null || $lng === null) fail('Konum gerekli');
            $heading = num_in($b['heading'] ?? null, 0, 360, 'Yön');
            $limit = num_in($b['speedLimit'] ?? null, 5, 160, 'Hız sınırı');
            $note = str_cut($b['note'] ?? null, 200);

            $st = $db->prepare('SELECT COUNT(*) FROM hazards WHERE (reporter = ? OR ip = ?) AND created_at > ?');
            $st->execute([$dev, client_ip(), nowMs() - 3600000]);
            if ((int) $st->fetchColumn() >= (int) setting('reports_per_hour')) fail('Çok fazla bildirim. Biraz sonra tekrar dene.', 429);

            // Aynı yerde aynı tür zaten varsa yenisini açma, onu onayla
            $d = 0.0006;
            $st = $db->prepare('SELECT id FROM hazards WHERE type = ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
                AND (expires_at IS NULL OR expires_at > ?) LIMIT 1');
            $st->execute([$type, $lat - $d, $lat + $d, $lng - $d, $lng + $d, nowMs()]);
            $dup = $st->fetchColumn();
            if ($dup) { do_vote($db, (int) $dup, $dev, 1, true); json_out(['id' => (string) $dup, 'merged' => true]); }

            $ttl = ttl_hours($type);
            $db->prepare('INSERT INTO hazards (type, subtype, lat, lng, heading, speed_limit, note, created_at, expires_at, reporter, ip, source)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$type, $sub, $lat, $lng, $heading, $limit === null ? null : (int) $limit, $note,
                    nowMs(), $ttl ? nowMs() + (int) ($ttl * 3600000) : null, $dev, client_ip(), 'user']);
            $id = $db->lastInsertId();
            $db->prepare('UPDATE devices SET reports = reports + 1 WHERE id = ?')->execute([$dev]);
            json_out(['id' => (string) $id], 201);
        }

        case 'vote': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST gerekli', 405);
            $dev = device_id(true); $b = json_body(); $db = db();
            require_not_banned(touch_device($dev));
            $id = (int) ($b['id'] ?? 0); $val = (int) ($b['value'] ?? 0);
            if ($id <= 0 || ($val !== 1 && $val !== -1)) fail('Geçersiz oy');
            do_vote($db, $id, $dev, $val, false);
            json_out(['ok' => true]);
        }

        default:
            fail('Bilinmeyen işlem', 404);
    }
} catch (Throwable $e) {
    error_log('yol-uyari: ' . $e->getMessage());
    fail('Sunucu hatası', 500);
}
