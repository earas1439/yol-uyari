<?php
/**
 * Yol Uyarı – yönetici API'si. Yalnızca admin/ panelinden, oturum açılmışken kullanılır.
 * Yönetici kullanıcı adı ve şifresi kurulumda api/config.php'ye yazılır.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

ini_set('session.use_strict_mode', '1');
session_name('yu_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')]);
session_start();

$action = (string) ($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function authed(): bool { return !empty($_SESSION['yu_admin']) && ($_SESSION['yu_ip'] ?? '') === client_ip(); }
function need_auth(): void {
    if (!authed()) fail('Oturum açmanız gerekiyor', 401);
    global $method;
    if ($method === 'POST' && !hash_equals((string) ($_SESSION['yu_csrf'] ?? ''), (string) ($_SERVER['HTTP_X_CSRF'] ?? ''))) fail('Güvenlik anahtarı geçersiz, sayfayı yenileyin', 403);
}
function need_post(): void { global $method; if ($method !== 'POST') fail('POST gerekli', 405); }

function write_config(array $cfg): void {
    $path = __DIR__ . '/config.php';
    $php = "<?php\n// Kurulum sihirbazı / yönetici paneli tarafından oluşturuldu. Bu dosyayı paylaşma.\nreturn " . var_export($cfg, true) . ";\n";
    if (@file_put_contents($path, $php, LOCK_EX) === false) fail('config.php yazılamadı (dosya izni)', 500);
    if (function_exists('opcache_invalidate')) @opcache_invalidate($path, true);
}

// ---------------- Harita dosyası (tiles/turkiye.pmtiles) ----------------
const MAP_DEFAULT_SRC = 'https://github.com/earas1439/yol-uyari/releases/download/harita/turkiye.pmtiles';
const MAP_CHUNK = 24 * 1048576;
function map_dir(): string { return dirname(__DIR__) . '/tiles'; }
function map_file_info(): array {
    $f = map_dir() . '/turkiye.pmtiles'; $part = $f . '.part';
    return ['exists' => is_file($f), 'size' => is_file($f) ? filesize($f) : 0, 'updated' => is_file($f) ? filemtime($f) * 1000 : null,
        'partSize' => is_file($part) ? filesize($part) : 0, 'total' => (int) ($_SESSION['yu_map_total'] ?? 0)];
}
function ensure_map_dir(): void {
    $d = map_dir();
    if (!is_dir($d) && !@mkdir($d, 0755, true)) fail('tiles klasörü oluşturulamadı (dosya izni)', 500);
    $ht = $d . '/.htaccess';
    if (!is_file($ht)) @file_put_contents($ht, "# Harita dosyası parça parça (Range) okunur; sıkıştırma kapalı\n<IfModule mod_deflate.c>\n  SetEnvIfNoCase Request_URI \\.pmtiles$ no-gzip\n</IfModule>\n<IfModule mod_headers.c>\n  Header set Accept-Ranges bytes\n</IfModule>\nAddType application/octet-stream .pmtiles\n");
}
function curl_range(string $url, ?int $from, ?int $to, $fh = null): array {
    if (!function_exists('curl_init')) fail('Sunucuda cURL yok; harita dosyasını dosya yöneticisiyle tiles/ klasörüne yükleyin.', 500);
    $c = curl_init($url);
    $opt = [CURLOPT_FOLLOWLOCATION => true, CURLOPT_CONNECTTIMEOUT => 15, CURLOPT_TIMEOUT => 110, CURLOPT_USERAGENT => 'yol-uyari-panel', CURLOPT_FAILONERROR => true];
    if ($from !== null) $opt[CURLOPT_RANGE] = $from . '-' . $to;
    if ($fh) $opt[CURLOPT_FILE] = $fh; else { $opt[CURLOPT_NOBODY] = true; $opt[CURLOPT_HEADER] = true; $opt[CURLOPT_RETURNTRANSFER] = true; }
    curl_setopt_array($c, $opt);
    $ok = curl_exec($c);
    $info = ['code' => (int) curl_getinfo($c, CURLINFO_RESPONSE_CODE), 'len' => (int) curl_getinfo($c, CURLINFO_CONTENT_LENGTH_DOWNLOAD), 'err' => curl_error($c)];
    curl_close($c);
    if ($ok === false) fail('İndirme hatası: ' . ($info['err'] ?: 'HTTP ' . $info['code']), 502);
    return $info;
}

/** Dosyanın toplam boyutunu ilk baytı isteyerek öğrenir (GitHub'ın imzalı adresleri HEAD kabul etmez) */
function probe_size(string $url): int {
    if (!function_exists('curl_init')) fail('Sunucuda cURL yok; harita dosyasını dosya yöneticisiyle tiles/ klasörüne yükleyin.', 500);
    $hdr = [];
    $c = curl_init($url);
    curl_setopt_array($c, [CURLOPT_FOLLOWLOCATION => true, CURLOPT_CONNECTTIMEOUT => 15, CURLOPT_TIMEOUT => 30, CURLOPT_RANGE => '0-0',
        CURLOPT_USERAGENT => 'yol-uyari-panel',
        CURLOPT_HEADERFUNCTION => function ($ch, $h) use (&$hdr) { $p = strpos($h, ':'); if ($p) $hdr[strtolower(trim(substr($h, 0, $p)))] = trim(substr($h, $p + 1)); return strlen($h); },
        CURLOPT_WRITEFUNCTION => function ($ch, $d) { return 0; }]);   // gövdeyi okumadan kes
    curl_exec($c);
    $code = (int) curl_getinfo($c, CURLINFO_RESPONSE_CODE);
    curl_close($c);
    if ($code >= 400 || $code === 0) fail("Harita dosyasına ulaşılamadı (HTTP $code). GitHub'da 'Türkiye Haritasını Üret' işlemi çalıştırıldı mı?", 502);
    if (isset($hdr['content-range']) && preg_match('#/(\d+)#', $hdr['content-range'], $m)) return (int) $m[1];
    if ($code === 200 && isset($hdr['content-length'])) return (int) $hdr['content-length'];
    return 0;
}

try {
    $db = db();
    switch ($action) {

        // ---------------- Oturum ----------------
        case 'me':
            json_out(['authed' => authed(), 'user' => $_SESSION['yu_user'] ?? null, 'csrf' => authed() ? $_SESSION['yu_csrf'] : null,
                'configured' => !empty(app_config()['admin_hash'])]);

        case 'login': {
            need_post();
            $cfg = app_config();
            if (empty($cfg['admin_hash'])) fail('Yönetici hesabı tanımlı değil. kurulum.php ile yeniden kurulum yapın.', 403);
            $st = $db->prepare('SELECT COUNT(*) FROM login_fail WHERE ip = ? AND at > ?');
            $st->execute([client_ip(), nowMs() - 15 * 60000]);
            if ((int) $st->fetchColumn() >= 5) fail('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.', 429);
            $b = json_body();
            $ok = hash_equals((string) ($cfg['admin_user'] ?? ''), (string) ($b['user'] ?? ''))
                && password_verify((string) ($b['pass'] ?? ''), (string) $cfg['admin_hash']);
            if (!$ok) {
                $db->prepare('INSERT INTO login_fail (ip, at) VALUES (?, ?)')->execute([client_ip(), nowMs()]);
                usleep(400000);
                fail('Kullanıcı adı veya şifre hatalı', 401);
            }
            session_regenerate_id(true);
            $_SESSION['yu_admin'] = true; $_SESSION['yu_user'] = $cfg['admin_user'];
            $_SESSION['yu_ip'] = client_ip(); $_SESSION['yu_csrf'] = bin2hex(random_bytes(16));
            json_out(['ok' => true, 'csrf' => $_SESSION['yu_csrf'], 'user' => $cfg['admin_user']]);
        }

        case 'logout':
            $_SESSION = []; session_destroy();
            json_out(['ok' => true]);

        // ---------------- İstatistik ----------------
        case 'stats': {
            need_auth(); cleanup(true);
            $now = nowMs(); $day = 86400000;
            $one = function (string $sql, array $p = []) use ($db) { $s = $db->prepare($sql); $s->execute($p); return (int) $s->fetchColumn(); };
            $active = "(expires_at IS NULL OR expires_at > $now)";
            $byType = [];
            foreach ($db->query("SELECT type, source, COUNT(*) c FROM hazards WHERE $active GROUP BY type, source")->fetchAll() as $r) {
                $byType[$r['type']][$r['source']] = (int) $r['c'];
            }
            $daily = [];
            $st = $db->prepare('SELECT created_at FROM hazards WHERE created_at > ? AND source = ?');
            $st->execute([$now - 14 * $day, 'user']);
            $tz = new DateTimeZone('Europe/Istanbul');
            for ($i = 13; $i >= 0; $i--) $daily[(new DateTime('@' . intdiv($now - $i * $day, 1000)))->setTimezone($tz)->format('Y-m-d')] = 0;
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $t) {
                $k = (new DateTime('@' . intdiv((int) $t, 1000)))->setTimezone($tz)->format('Y-m-d');
                if (isset($daily[$k])) $daily[$k]++;
            }
            $top = $db->query('SELECT id, reports, votes, last_seen, banned FROM devices ORDER BY reports DESC LIMIT 5')->fetchAll();
            json_out([
                'activeHazards' => $one("SELECT COUNT(*) FROM hazards WHERE $active"),
                'officialHazards' => $one("SELECT COUNT(*) FROM hazards WHERE $active AND source = 'official'"),
                'reports24h' => $one('SELECT COUNT(*) FROM hazards WHERE created_at > ? AND source = ?', [$now - $day, 'user']),
                'reports7d' => $one('SELECT COUNT(*) FROM hazards WHERE created_at > ? AND source = ?', [$now - 7 * $day, 'user']),
                'votes24h' => $one('SELECT COUNT(*) FROM votes WHERE at > ?', [$now - $day]),
                'devices' => $one('SELECT COUNT(*) FROM devices'),
                'devices24h' => $one('SELECT COUNT(*) FROM devices WHERE last_seen > ?', [$now - $day]),
                'devices7d' => $one('SELECT COUNT(*) FROM devices WHERE last_seen > ?', [$now - 7 * $day]),
                'online' => $one('SELECT COUNT(*) FROM devices WHERE last_seen > ?', [$now - 5 * 60000]),
                'banned' => $one('SELECT COUNT(*) FROM devices WHERE banned = 1'),
                'trafficSamples10m' => $one('SELECT COUNT(*) FROM speed_samples WHERE at > ?', [$now - 10 * 60000]),
                'trafficCells' => $one('SELECT COUNT(*) FROM cell_ref'),
                'mapFile' => map_file_info(),
                'byType' => $byType, 'daily' => $daily, 'topReporters' => $top,
                'db' => is_mysql($db) ? 'MySQL' : 'SQLite', 'php' => PHP_VERSION,
            ]);
        }

        // ---------------- Uyarı noktaları ----------------
        case 'hazards': {
            need_auth();
            $w = ['1=1']; $p = [];
            if (isset($_GET['bbox'])) {
                $b = array_map('floatval', explode(',', (string) $_GET['bbox']));
                if (count($b) === 4) { $w[] = 'lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'; array_push($p, $b[0], $b[2], $b[1], $b[3]); }
            }
            if (!empty($_GET['type']) && in_array($_GET['type'], TYPES, true)) { $w[] = 'type = ?'; $p[] = $_GET['type']; }
            if (!empty($_GET['source']) && in_array($_GET['source'], ['user', 'official'], true)) { $w[] = 'source = ?'; $p[] = $_GET['source']; }
            if (empty($_GET['expired'])) { $w[] = '(expires_at IS NULL OR expires_at > ?)'; $p[] = nowMs(); }
            if (!empty($_GET['q'])) { $w[] = '(note LIKE ? OR reporter LIKE ?)'; $q = '%' . $_GET['q'] . '%'; array_push($p, $q, $q); }
            $limit = min(5000, max(1, (int) ($_GET['limit'] ?? 2000)));
            $st = $db->prepare('SELECT * FROM hazards WHERE ' . implode(' AND ', $w) . " ORDER BY id DESC LIMIT $limit");
            $st->execute($p);
            json_out(array_map(fn($r) => hazard_out($r) + ['reporter' => $r['reporter'], 'ip' => $r['ip']], $st->fetchAll()));
        }

        case 'hazard_save': {
            need_auth(); need_post();
            $b = json_body();
            $type = (string) ($b['type'] ?? '');
            if (!in_array($type, TYPES, true)) fail('Geçersiz tür');
            $sub = $b['subtype'] ?? null;
            if ($sub === '') $sub = null;
            if ($sub !== null && !in_array($sub, SUBTYPES, true)) fail('Geçersiz alt tür');
            $lat = num_in($b['lat'] ?? null, -90, 90, 'Enlem'); $lng = num_in($b['lng'] ?? null, -180, 180, 'Boylam');
            if ($lat === null || $lng === null) fail('Konum gerekli');
            $heading = num_in($b['heading'] ?? null, 0, 360, 'Yön');
            $limit = num_in($b['speedLimit'] ?? null, 5, 160, 'Hız sınırı');
            $note = str_cut($b['note'] ?? null, 200);
            $hours = num_in($b['hours'] ?? null, 0.1, 24 * 365, 'Süre');
            $exp = $hours ? nowMs() + (int) ($hours * 3600000) : null;
            $id = (int) ($b['id'] ?? 0);
            if ($id > 0) {
                $db->prepare('UPDATE hazards SET type=?, subtype=?, lat=?, lng=?, heading=?, speed_limit=?, note=?, expires_at=?, source=? WHERE id=?')
                    ->execute([$type, $sub, $lat, $lng, $heading, $limit === null ? null : (int) $limit, $note, $exp, 'official', $id]);
            } else {
                $db->prepare('INSERT INTO hazards (type, subtype, lat, lng, heading, speed_limit, note, created_at, expires_at, reporter, ip, source)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([$type, $sub, $lat, $lng, $heading, $limit === null ? null : (int) $limit, $note, nowMs(), $exp,
                        'admin:' . ($_SESSION['yu_user'] ?? ''), client_ip(), 'official']);
                $id = (int) $db->lastInsertId();
            }
            json_out(['ok' => true, 'id' => (string) $id]);
        }

        case 'hazard_delete': {
            need_auth(); need_post();
            $ids = array_values(array_filter(array_map('intval', (array) (json_body()['ids'] ?? [])), fn($x) => $x > 0));
            if (!$ids) fail('Silinecek nokta seçilmedi');
            $in = implode(',', array_fill(0, count($ids), '?'));
            $db->prepare("DELETE FROM votes WHERE hazard_id IN ($in)")->execute($ids);
            $st = $db->prepare("DELETE FROM hazards WHERE id IN ($in)"); $st->execute($ids);
            json_out(['ok' => true, 'deleted' => $st->rowCount()]);
        }

        case 'hazards_import': {
            need_auth(); need_post();
            $b = json_body();
            $lines = preg_split('/\r?\n/', (string) ($b['csv'] ?? ''));
            $defType = in_array($b['type'] ?? '', TYPES, true) ? $b['type'] : 'fixedRadar';
            $ins = $db->prepare('INSERT INTO hazards (type, subtype, lat, lng, heading, speed_limit, note, created_at, expires_at, reporter, ip, source)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            $ok = 0; $bad = [];
            $db->beginTransaction();
            foreach ($lines as $i => $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') continue;
                $c = str_getcsv(str_replace(';', ',', $line));
                $lat = $c[0] ?? null; $lng = $c[1] ?? null;
                if (!is_numeric($lat) || !is_numeric($lng)) { if ($i > 0 || !preg_match('/[a-z]/i', $line)) $bad[] = $i + 1; continue; }
                $type = in_array(trim($c[2] ?? ''), TYPES, true) ? trim($c[2]) : $defType;
                $lim = isset($c[3]) && is_numeric($c[3]) && $c[3] > 0 && $c[3] <= 160 ? (int) $c[3] : null;
                $hd = isset($c[4]) && is_numeric($c[4]) && $c[4] >= 0 && $c[4] <= 360 ? (float) $c[4] : null;
                $note = str_cut($c[5] ?? null, 200);
                if ((float) $lat < -90 || (float) $lat > 90 || (float) $lng < -180 || (float) $lng > 180) { $bad[] = $i + 1; continue; }
                $ins->execute([$type, null, (float) $lat, (float) $lng, $hd, $lim, $note, nowMs(), null, 'admin:import', client_ip(), 'official']);
                $ok++;
            }
            $db->commit();
            json_out(['ok' => true, 'imported' => $ok, 'badLines' => array_slice($bad, 0, 50)]);
        }

        // ---------------- Kullanıcılar (cihazlar) ----------------
        case 'devices': {
            need_auth();
            $w = ['1=1']; $p = [];
            if (!empty($_GET['q'])) { $w[] = '(id LIKE ? OR last_ip LIKE ? OR note LIKE ?)'; $q = '%' . $_GET['q'] . '%'; array_push($p, $q, $q, $q); }
            if (($_GET['filter'] ?? '') === 'banned') $w[] = 'banned = 1';
            if (($_GET['filter'] ?? '') === 'active') { $w[] = 'last_seen > ?'; $p[] = nowMs() - 86400000; }
            $sort = ['seen' => 'last_seen DESC', 'reports' => 'reports DESC', 'first' => 'first_seen DESC'][$_GET['sort'] ?? 'seen'] ?? 'last_seen DESC';
            $st = $db->prepare('SELECT * FROM devices WHERE ' . implode(' AND ', $w) . " ORDER BY $sort LIMIT 500");
            $st->execute($p);
            json_out($st->fetchAll());
        }

        case 'device_update': {
            need_auth(); need_post();
            $b = json_body(); $id = (string) ($b['id'] ?? '');
            if ($id === '') fail('Cihaz seçilmedi');
            if (array_key_exists('banned', $b)) $db->prepare('UPDATE devices SET banned = ? WHERE id = ?')->execute([$b['banned'] ? 1 : 0, $id]);
            if (array_key_exists('note', $b)) $db->prepare('UPDATE devices SET note = ? WHERE id = ?')->execute([str_cut($b['note'], 200), $id]);
            $deleted = 0;
            if (!empty($b['deleteReports'])) {
                $db->prepare("DELETE FROM votes WHERE hazard_id IN (SELECT id FROM hazards WHERE reporter = ? AND source = 'user')")->execute([$id]);
                $st = $db->prepare("DELETE FROM hazards WHERE reporter = ? AND source = 'user'"); $st->execute([$id]);
                $deleted = $st->rowCount();
            }
            json_out(['ok' => true, 'deletedReports' => $deleted]);
        }

        // ---------------- Toplu bildirim (duyurular) ----------------
        case 'messages': {
            need_auth();
            json_out($db->query('SELECT * FROM messages ORDER BY id DESC LIMIT 100')->fetchAll());
        }

        case 'message_send': {
            need_auth(); need_post();
            $b = json_body();
            $title = str_cut($b['title'] ?? null, 120);
            if (!$title) fail('Başlık gerekli');
            $body = str_cut($b['body'] ?? null, 1000);
            $level = in_array($b['level'] ?? '', ['info', 'warning', 'danger'], true) ? $b['level'] : 'info';
            $hours = num_in($b['hours'] ?? 24, 0.25, 24 * 30, 'Süre') ?? 24;
            $lat = num_in($b['lat'] ?? null, -90, 90, 'Enlem'); $lng = num_in($b['lng'] ?? null, -180, 180, 'Boylam');
            $rad = num_in($b['radius_km'] ?? null, 0.1, 5000, 'Yarıçap');
            if ($rad !== null && ($lat === null || $lng === null)) fail('Bölgesel duyuru için haritadan merkez seçin');
            $db->prepare('INSERT INTO messages (title, body, level, created_at, expires_at, lat, lng, radius_km) VALUES (?,?,?,?,?,?,?,?)')
                ->execute([$title, $body, $level, nowMs(), nowMs() + (int) ($hours * 3600000), $rad ? $lat : null, $rad ? $lng : null, $rad]);
            json_out(['ok' => true, 'id' => (int) $db->lastInsertId()]);
        }

        case 'message_delete': {
            need_auth(); need_post();
            $db->prepare('DELETE FROM messages WHERE id = ?')->execute([(int) (json_body()['id'] ?? 0)]);
            json_out(['ok' => true]);
        }

        case 'map_info':
            need_auth();
            json_out(map_file_info() + ['source' => MAP_DEFAULT_SRC]);

        case 'map_download': {
            // Parça parça indirir (her çağrı ~24 MB) — paylaşımlı hostinglerin süre sınırına takılmamak için
            need_auth(); need_post(); @set_time_limit(130);
            $b = json_body();
            $src = (string) ($b['url'] ?? '') ?: MAP_DEFAULT_SRC;
            if (!preg_match('#^https://#', $src) && !preg_match('#^http://(127\.0\.0\.1|localhost)[:/]#', $src)) fail('Adres https:// ile başlamalı');
            ensure_map_dir();
            $f = map_dir() . '/turkiye.pmtiles'; $part = $f . '.part';
            if (!empty($b['reset'])) {
                @unlink($part);
                $len = probe_size($src);
                if ($len <= 0) fail('Dosya boyutu öğrenilemedi. Adresi kontrol edin (GitHub Actions ile harita üretildi mi?)', 502);
                $_SESSION['yu_map_total'] = $len; $_SESSION['yu_map_src'] = $src;
                json_out(['received' => 0, 'total' => $len, 'done' => false]);
            }
            $total = (int) ($_SESSION['yu_map_total'] ?? 0);
            if ($total <= 0 || ($_SESSION['yu_map_src'] ?? '') !== $src) fail('İndirmeyi baştan başlatın', 409);
            clearstatcache();
            $have = is_file($part) ? filesize($part) : 0;
            if ($have < $total) {
                $fh = fopen($part, 'ab'); if (!$fh) fail('Dosya yazılamıyor (tiles klasörü izni)', 500);
                $to = min($total, $have + MAP_CHUNK) - 1;
                $r = curl_range($src, $have, $to, $fh); fclose($fh);
                if ($r['code'] !== 206 && $have > 0) fail('Kaynak sunucu parçalı indirmeyi desteklemiyor', 502);
                clearstatcache(); $have = filesize($part);
            }
            if ($have >= $total) {
                $hd = (string) @file_get_contents($part, false, null, 0, 7);
                if ($hd !== 'PMTiles') { @unlink($part); fail('İnen dosya geçerli bir harita dosyası değil', 502); }
                @unlink($f); rename($part, $f); unset($_SESSION['yu_map_total']);
                json_out(['received' => $total, 'total' => $total, 'done' => true]);
            }
            json_out(['received' => $have, 'total' => $total, 'done' => false]);
        }

        case 'map_delete':
            need_auth(); need_post();
            @unlink(map_dir() . '/turkiye.pmtiles'); @unlink(map_dir() . '/turkiye.pmtiles.part');
            json_out(['ok' => true]);

        // ---------------- Ayarlar ----------------
        case 'settings': {
            need_auth();
            json_out(['settings' => settings(), 'defaults' => DEFAULT_SETTINGS, 'types' => TYPES]);
        }

        case 'settings_save': {
            need_auth(); need_post();
            $b = json_body();
            $int = fn($v, $min, $max) => max($min, min($max, (int) $v));
            foreach ($b as $k => $v) {
                switch ($k) {
                    case 'poll_seconds': save_setting($k, $int($v, 5, 120)); break;
                    case 'reports_per_hour': save_setting($k, $int($v, 1, 1000)); break;
                    case 'votes_per_hour': save_setting($k, $int($v, 1, 5000)); break;
                    case 'hide_after': save_setting($k, $int($v, 1, 50)); break;
                    case 'start_notice': save_setting($k, (string) str_cut($v, 500)); break;
                    case 'reporting_enabled': case 'default_zone_mode': case 'traffic_enabled': save_setting($k, (bool) $v); break;
                    case 'tomtom_key': save_setting($k, preg_replace('/[^A-Za-z0-9_-]/', '', (string) $v)); break;
                    case 'tiles_url': save_setting($k, (string) str_cut($v, 300)); break;
                    case 'report_types': save_setting($k, array_values(array_intersect(TYPES, (array) $v))); break;
                    case 'ttl_hours':
                        $t = [];
                        foreach ((array) $v as $type => $h) if (in_array($type, TYPES, true) && !in_array($type, PERMANENT_TYPES, true) && is_numeric($h)) $t[$type] = max(0.25, min(24 * 90, (float) $h));
                        save_setting($k, $t + DEFAULT_SETTINGS['ttl_hours']);
                        break;
                }
            }
            json_out(['ok' => true]);
        }

        case 'password': {
            need_auth(); need_post();
            $b = json_body(); $cfg = app_config();
            if (!password_verify((string) ($b['old'] ?? ''), (string) ($cfg['admin_hash'] ?? ''))) fail('Mevcut şifre hatalı', 403);
            $new = (string) ($b['new'] ?? '');
            if (strlen($new) < 8) fail('Yeni şifre en az 8 karakter olmalı');
            if (!empty($b['user'])) {
                if (!preg_match('/^[A-Za-z0-9_.@-]{3,40}$/', (string) $b['user'])) fail('Kullanıcı adı 3-40 karakter, harf/rakam olmalı');
                $cfg['admin_user'] = (string) $b['user'];
            }
            $cfg['admin_hash'] = password_hash($new, PASSWORD_DEFAULT);
            write_config($cfg);
            $_SESSION['yu_user'] = $cfg['admin_user'];
            json_out(['ok' => true]);
        }

        default:
            fail('Bilinmeyen işlem', 404);
    }
} catch (Throwable $e) {
    error_log('yol-uyari admin: ' . $e->getMessage());
    fail('Sunucu hatası: ' . $e->getMessage(), 500);
}
