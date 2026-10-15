<?php
/**
 * Yol Uyarı – basit sunucu (PHP 7.4+ / 8.x, SQLite veya MySQL)
 *
 * Herhangi bir PHP hostinge api/ klasörüyle birlikte yükle; başka kurulum gerekmez.
 * Veritabanı ilk istekte api/data/yoluyari.sqlite olarak kendiliğinden oluşur.
 * MySQL kullanmak istersen config.example.php dosyasını config.php olarak kopyalayıp doldur.
 *
 *   GET  api/?action=ping
 *   GET  api/?action=hazards&lat=41.0&lng=29.0&radius=8000
 *   POST api/?action=report   {type, subtype, lat, lng, heading, speedLimit, note}
 *   POST api/?action=vote     {id, value: 1 | -1}
 *   İstekler X-Device-Id başlığı taşır (uygulama her cihaz için rastgele üretir).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Device-Id');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

const TYPES = [
    'fixedRadar' => null, 'eds' => null,       // kalıcı
    'mobileRadar' => 3, 'trafficControl' => 3, // saat
    'accident' => 2, 'natural' => 12,
];
const SUBTYPES = ['flood', 'landslide', 'fire', 'snowIce', 'fog', 'earthquake', 'storm', 'other', 'avgStart', 'avgEnd'];
const MAX_REPORTS_PER_HOUR = 20;
const MAX_VOTES_PER_HOUR = 120;

function out($data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): void { out(['error' => $msg], $code); }

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = is_file(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
    if (!empty($cfg['mysql_dsn'])) {
        $pdo = new PDO($cfg['mysql_dsn'], $cfg['mysql_user'] ?? '', $cfg['mysql_pass'] ?? '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $auto = 'BIGINT AUTO_INCREMENT PRIMARY KEY';
    } else {
        $dir = __DIR__ . '/data';
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        $pdo = new PDO('sqlite:' . $dir . '/yoluyari.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
        $auto = 'INTEGER PRIMARY KEY AUTOINCREMENT';
    }
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("CREATE TABLE IF NOT EXISTS hazards (
        id $auto, type VARCHAR(20) NOT NULL, subtype VARCHAR(20), lat DOUBLE NOT NULL, lng DOUBLE NOT NULL,
        heading DOUBLE, speed_limit INT, note VARCHAR(200), created_at BIGINT NOT NULL, expires_at BIGINT,
        confirmations INT NOT NULL DEFAULT 0, denials INT NOT NULL DEFAULT 0, reporter VARCHAR(64) NOT NULL, ip VARCHAR(64))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS votes (hazard_id BIGINT NOT NULL, device VARCHAR(64) NOT NULL, value INT NOT NULL, at BIGINT NOT NULL, ip VARCHAR(64),
        PRIMARY KEY (hazard_id, device))");
    try { $pdo->exec('CREATE INDEX idx_hz_lat ON hazards (lat)'); } catch (Throwable $e) {}
    return $pdo;
}

function device(): string {
    $d = $_SERVER['HTTP_X_DEVICE_ID'] ?? '';
    if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $d)) fail('Geçersiz cihaz kimliği', 401);
    return $d;
}
function ip(): string { return substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 64); }
function nowMs(): int { return (int) round(microtime(true) * 1000); }
function body(): array {
    $j = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($j)) fail('Geçersiz istek gövdesi');
    return $j;
}
function num($v, float $min, float $max): ?float {
    if ($v === null || $v === '') return null;
    if (!is_numeric($v)) fail('Geçersiz sayı');
    $f = (float) $v;
    if ($f < $min || $f > $max) fail('Değer aralık dışında');
    return $f;
}

function cleanup(PDO $db): void {
    if (random_int(1, 50) !== 1) return; // her istekte değil
    $now = nowMs();
    $db->exec("DELETE FROM votes WHERE hazard_id IN (SELECT id FROM hazards WHERE (expires_at IS NOT NULL AND expires_at < $now) OR denials - confirmations >= 3)");
    $db->exec("DELETE FROM hazards WHERE (expires_at IS NOT NULL AND expires_at < $now) OR denials - confirmations >= 3");
}

function rowOut(array $r): array {
    return [
        'id' => (string) $r['id'], 'type' => $r['type'], 'subtype' => $r['subtype'],
        'lat' => (float) $r['lat'], 'lng' => (float) $r['lng'],
        'heading' => $r['heading'] === null ? null : (float) $r['heading'],
        'speedLimit' => $r['speed_limit'] === null ? null : (int) $r['speed_limit'],
        'note' => $r['note'], 'createdAt' => (int) $r['created_at'],
        'expiresAt' => $r['expires_at'] === null ? null : (int) $r['expires_at'],
        'confirmations' => (int) $r['confirmations'], 'denials' => (int) $r['denials'],
        'source' => 'user', 'mine' => isset($r['mine']) ? (bool) $r['mine'] : false,
    ];
}

$action = $_GET['action'] ?? '';
try {
    switch ($action) {
        case 'ping':
            db();
            out(['ok' => true, 'app' => 'yol-uyari', 'version' => 1]);

        case 'hazards': {
            $lat = num($_GET['lat'] ?? null, -90, 90);
            $lng = num($_GET['lng'] ?? null, -180, 180);
            $r = num($_GET['radius'] ?? 8000, 100, 50000) ?? 8000;
            if ($lat === null || $lng === null) fail('lat ve lng gerekli');
            $dLat = $r / 111320; $dLng = $r / (111320 * max(0.01, cos(deg2rad($lat))));
            $db = db(); cleanup($db);
            $dev = $_SERVER['HTTP_X_DEVICE_ID'] ?? '';
            $st = $db->prepare('SELECT *, (reporter = ?) AS mine FROM hazards
                WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
                AND (expires_at IS NULL OR expires_at > ?) AND denials - confirmations < 3
                ORDER BY id DESC LIMIT 1000');
            $st->execute([$dev, $lat - $dLat, $lat + $dLat, $lng - $dLng, $lng + $dLng, nowMs()]);
            out(array_map('rowOut', $st->fetchAll()));
        }

        case 'report': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST gerekli', 405);
            $dev = device(); $b = body(); $db = db();
            $type = (string) ($b['type'] ?? '');
            if (!array_key_exists($type, TYPES)) fail('Geçersiz tür');
            $sub = $b['subtype'] ?? null;
            if ($sub !== null && !in_array($sub, SUBTYPES, true)) fail('Geçersiz alt tür');
            $lat = num($b['lat'] ?? null, -90, 90); $lng = num($b['lng'] ?? null, -180, 180);
            if ($lat === null || $lng === null) fail('Konum gerekli');
            $heading = num($b['heading'] ?? null, 0, 360);
            $limit = num($b['speedLimit'] ?? null, 5, 160);
            $note = isset($b['note']) ? (function_exists('mb_substr') ? mb_substr(trim((string) $b['note']), 0, 200) : substr(trim((string) $b['note']), 0, 200)) : null;

            $hourAgo = nowMs() - 3600_000;
            $st = $db->prepare('SELECT COUNT(*) FROM hazards WHERE (reporter = ? OR ip = ?) AND created_at > ?');
            $st->execute([$dev, ip(), $hourAgo]);
            if ((int) $st->fetchColumn() >= MAX_REPORTS_PER_HOUR) fail('Çok fazla bildirim. Biraz sonra tekrar dene.', 429);

            // Aynı yerde aynı tür zaten varsa yenisini açma, onu onayla
            $d = 0.0006;
            $st = $db->prepare('SELECT id FROM hazards WHERE type = ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
                AND (expires_at IS NULL OR expires_at > ?) AND denials - confirmations < 3 LIMIT 1');
            $st->execute([$type, $lat - $d, $lat + $d, $lng - $d, $lng + $d, nowMs()]);
            $dup = $st->fetchColumn();
            if ($dup) { vote($db, (int) $dup, $dev, 1, true); out(['id' => (string) $dup, 'merged' => true]); }

            $ttl = TYPES[$type];
            $st = $db->prepare('INSERT INTO hazards (type, subtype, lat, lng, heading, speed_limit, note, created_at, expires_at, reporter, ip)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)');
            $st->execute([$type, $sub, $lat, $lng, $heading, $limit === null ? null : (int) $limit, $note ?: null,
                nowMs(), $ttl ? nowMs() + $ttl * 3600_000 : null, $dev, ip()]);
            out(['id' => (string) $db->lastInsertId()], 201);
        }

        case 'vote': {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST gerekli', 405);
            $dev = device(); $b = body(); $db = db();
            $id = (int) ($b['id'] ?? 0); $val = (int) ($b['value'] ?? 0);
            if ($id <= 0 || ($val !== 1 && $val !== -1)) fail('Geçersiz oy');
            vote($db, $id, $dev, $val, false);
            out(['ok' => true]);
        }

        default:
            fail('Bilinmeyen işlem', 404);
    }
} catch (Throwable $e) {
    error_log('yol-uyari: ' . $e->getMessage());
    fail('Sunucu hatası', 500);
}

function vote(PDO $db, int $id, string $dev, int $val, bool $silentIfVoted): void {
    $st = $db->prepare('SELECT type FROM hazards WHERE id = ?');
    $st->execute([$id]);
    $type = $st->fetchColumn();
    if (!$type) fail('Nokta bulunamadı', 404);
    $st = $db->prepare('SELECT COUNT(*) FROM votes WHERE (device = ? OR ip = ?) AND at > ?');
    $st->execute([$dev, ip(), nowMs() - 3600_000]);
    if ((int) $st->fetchColumn() >= MAX_VOTES_PER_HOUR) fail('Çok fazla oy. Biraz sonra tekrar dene.', 429);
    $db->beginTransaction();
    try {
        $st = $db->prepare('INSERT INTO votes (hazard_id, device, value, at, ip) VALUES (?,?,?,?,?)');
        $st->execute([$id, $dev, $val, nowMs(), ip()]);
    } catch (PDOException $e) {
        $db->rollBack();
        if ($silentIfVoted) return;
        fail('Bu nokta için zaten oy verdin', 409);
    }
    $col = $val === 1 ? 'confirmations' : 'denials';
    $ttl = TYPES[$type] ?? null;
    if ($val === 1 && $ttl) {
        $st = $db->prepare("UPDATE hazards SET $col = $col + 1, expires_at = ? WHERE id = ?");
        $st->execute([nowMs() + $ttl * 3600_000, $id]);
    } else {
        $db->prepare("UPDATE hazards SET $col = $col + 1 WHERE id = ?")->execute([$id]);
    }
    $db->commit();
}
