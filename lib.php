<?php
/**
 * Yol Uyarı – ortak sunucu kodu (veritabanı, ayarlar, yardımcılar).
 * index.php (uygulama API'si) ve admin.php (yönetici API'si) bunu kullanır.
 */
declare(strict_types=1);

const TYPES = ['fixedRadar', 'mobileRadar', 'eds', 'trafficControl', 'accident', 'roadwork', 'natural'];
const PERMANENT_TYPES = ['fixedRadar', 'eds'];
const SUBTYPES = ['flood', 'landslide', 'fire', 'snowIce', 'fog', 'earthquake', 'storm', 'other', 'avgStart', 'avgEnd'];

/** Yönetici panelinden değiştirilebilen ayarlar ve varsayılanları */
const DEFAULT_SETTINGS = [
    'poll_seconds'      => 10,
    'start_notice'      => '',
    'reporting_enabled' => true,
    'report_types'      => TYPES,
    'default_zone_mode' => false,
    'reports_per_hour'  => 20,
    'votes_per_hour'    => 120,
    'hide_after'        => 3,
    'ttl_hours'         => ['mobileRadar' => 3, 'trafficControl' => 3, 'accident' => 2, 'roadwork' => 168, 'natural' => 12],
    'traffic_enabled'   => true,
    'tomtom_key'        => '',
    'tiles_url'         => '',
];
const PUBLIC_SETTINGS = ['poll_seconds', 'start_notice', 'reporting_enabled', 'report_types', 'default_zone_mode', 'traffic_enabled', 'tomtom_key', 'tiles_url'];

function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $msg, int $code = 400): void { json_out(['error' => $msg], $code); }
function nowMs(): int { return (int) round(microtime(true) * 1000); }
function client_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64); }

function app_config(): array {
    static $cfg = null;
    if ($cfg === null) $cfg = is_file(__DIR__ . '/config.php') ? (array) (require __DIR__ . '/config.php') : [];
    return $cfg;
}

function is_mysql(PDO $db): bool { return $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql'; }

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = app_config();
    if (!empty($cfg['mysql_dsn'])) {
        $pdo = new PDO($cfg['mysql_dsn'], $cfg['mysql_user'] ?? '', $cfg['mysql_pass'] ?? '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $auto = 'BIGINT AUTO_INCREMENT PRIMARY KEY';
        $text = 'TEXT';
    } else {
        $dir = __DIR__ . '/data';
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        // Kurulum sihirbazı tahmin edilemez bir dosya adı verir (sunucu .htaccess desteklemese de indirilemez)
        $file = !empty($cfg['sqlite_file']) ? $dir . '/' . basename((string) $cfg['sqlite_file']) : $dir . '/yoluyari.sqlite';
        $pdo = new PDO('sqlite:' . $file, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000;');
        $auto = 'INTEGER PRIMARY KEY AUTOINCREMENT';
        $text = 'TEXT';
    }
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("CREATE TABLE IF NOT EXISTS hazards (
        id $auto, type VARCHAR(20) NOT NULL, subtype VARCHAR(20), lat DOUBLE NOT NULL, lng DOUBLE NOT NULL,
        heading DOUBLE, speed_limit INT, note VARCHAR(200), created_at BIGINT NOT NULL, expires_at BIGINT,
        confirmations INT NOT NULL DEFAULT 0, denials INT NOT NULL DEFAULT 0, reporter VARCHAR(64) NOT NULL, ip VARCHAR(64),
        source VARCHAR(10) NOT NULL DEFAULT 'user')");
    $pdo->exec("CREATE TABLE IF NOT EXISTS votes (hazard_id BIGINT NOT NULL, device VARCHAR(64) NOT NULL, value INT NOT NULL,
        at BIGINT NOT NULL, ip VARCHAR(64), PRIMARY KEY (hazard_id, device))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS devices (id VARCHAR(64) NOT NULL PRIMARY KEY, first_seen BIGINT NOT NULL,
        last_seen BIGINT NOT NULL, last_ip VARCHAR(64), last_lat DOUBLE, last_lng DOUBLE,
        reports INT NOT NULL DEFAULT 0, votes INT NOT NULL DEFAULT 0, banned INT NOT NULL DEFAULT 0, note VARCHAR(200))");
    $pdo->exec("CREATE TABLE IF NOT EXISTS messages (id $auto, title VARCHAR(120) NOT NULL, body $text, level VARCHAR(10) NOT NULL DEFAULT 'info',
        created_at BIGINT NOT NULL, expires_at BIGINT, lat DOUBLE, lng DOUBLE, radius_km DOUBLE)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (k VARCHAR(64) NOT NULL PRIMARY KEY, v $text)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS login_fail (ip VARCHAR(64) NOT NULL, at BIGINT NOT NULL)");
    // Trafik: kullanıcıların anonim hız örnekleri (kimlik saklanmaz) ve her hücrenin serbest akış hızı
    $pdo->exec("CREATE TABLE IF NOT EXISTS speed_samples (cell VARCHAR(10) NOT NULL, hb INT NOT NULL, speed DOUBLE NOT NULL,
        lat DOUBLE NOT NULL, lng DOUBLE NOT NULL, at BIGINT NOT NULL)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS cell_ref (cell VARCHAR(10) NOT NULL, hb INT NOT NULL, ref DOUBLE NOT NULL, n INT NOT NULL DEFAULT 1,
        PRIMARY KEY (cell, hb))");
    // Eski kurulumlardan geçiş
    try { $pdo->exec("ALTER TABLE hazards ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'user'"); } catch (Throwable $e) {}
    try { $pdo->exec('CREATE INDEX idx_hz_lat ON hazards (lat)'); } catch (Throwable $e) {}
    try { $pdo->exec('CREATE INDEX idx_hz_created ON hazards (created_at)'); } catch (Throwable $e) {}
    try { $pdo->exec('CREATE INDEX idx_dev_seen ON devices (last_seen)'); } catch (Throwable $e) {}
    try { $pdo->exec('CREATE INDEX idx_ss_at ON speed_samples (at)'); } catch (Throwable $e) {}
    try { $pdo->exec('CREATE INDEX idx_ss_lat ON speed_samples (lat)'); } catch (Throwable $e) {}
    return $pdo;
}

function settings(): array {
    static $s = null;
    if ($s !== null) return $s;
    $s = DEFAULT_SETTINGS;
    foreach (db()->query('SELECT k, v FROM settings')->fetchAll() as $r) {
        if (array_key_exists($r['k'], DEFAULT_SETTINGS)) $s[$r['k']] = json_decode((string) $r['v'], true);
    }
    return $s;
}
function setting(string $k) { return settings()[$k] ?? DEFAULT_SETTINGS[$k] ?? null; }
function save_setting(string $k, $v): void {
    $db = db();
    $sql = is_mysql($db) ? 'REPLACE INTO settings (k, v) VALUES (?, ?)' : 'INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)';
    $db->prepare($sql)->execute([$k, json_encode($v, JSON_UNESCAPED_UNICODE)]);
}
function ttl_hours(string $type): ?float {
    if (in_array($type, PERMANENT_TYPES, true)) return null;
    $t = setting('ttl_hours')[$type] ?? null;
    return $t === null ? null : (float) $t;
}

/** Cihazı kaydeder / son görülmeyi günceller (dakikada en fazla bir yazma). */
function touch_device(string $dev, ?float $lat = null, ?float $lng = null): array {
    $db = db();
    $st = $db->prepare('SELECT * FROM devices WHERE id = ?');
    $st->execute([$dev]);
    $row = $st->fetch();
    $now = nowMs();
    if (!$row) {
        $ins = is_mysql($db) ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
        $db->prepare("$ins INTO devices (id, first_seen, last_seen, last_ip, last_lat, last_lng) VALUES (?,?,?,?,?,?)")
            ->execute([$dev, $now, $now, client_ip(), $lat, $lng]);
        return ['id' => $dev, 'banned' => 0];
    }
    if ($now - (int) $row['last_seen'] > 60000) {
        $db->prepare('UPDATE devices SET last_seen = ?, last_ip = ?, last_lat = COALESCE(?, last_lat), last_lng = COALESCE(?, last_lng) WHERE id = ?')
            ->execute([$now, client_ip(), $lat, $lng, $dev]);
    }
    return $row;
}

function hazard_out(array $r): array {
    return [
        'id' => (string) $r['id'], 'type' => $r['type'], 'subtype' => $r['subtype'],
        'lat' => (float) $r['lat'], 'lng' => (float) $r['lng'],
        'heading' => $r['heading'] === null ? null : (float) $r['heading'],
        'speedLimit' => $r['speed_limit'] === null ? null : (int) $r['speed_limit'],
        'note' => $r['note'], 'createdAt' => (int) $r['created_at'],
        'expiresAt' => $r['expires_at'] === null ? null : (int) $r['expires_at'],
        'confirmations' => (int) $r['confirmations'], 'denials' => (int) $r['denials'],
        'source' => $r['source'] ?? 'user',
    ];
}

function haversine_km(float $a1, float $o1, float $a2, float $o2): float {
    $r = 6371.0;
    $dA = deg2rad($a2 - $a1); $dO = deg2rad($o2 - $o1);
    $h = sin($dA / 2) ** 2 + cos(deg2rad($a1)) * cos(deg2rad($a2)) * sin($dO / 2) ** 2;
    return 2 * $r * asin(min(1.0, sqrt($h)));
}

function num_in($v, float $min, float $max, string $what = 'Değer'): ?float {
    if ($v === null || $v === '') return null;
    if (!is_numeric($v)) fail("$what sayı olmalı");
    $f = (float) $v;
    if ($f < $min || $f > $max) fail("$what aralık dışında");
    return $f;
}
function json_body(): array {
    $j = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($j)) fail('Geçersiz istek gövdesi');
    return $j;
}
function str_cut($v, int $n): ?string {
    if ($v === null) return null;
    $v = trim((string) $v);
    if ($v === '') return null;
    return function_exists('mb_substr') ? mb_substr($v, 0, $n) : substr($v, 0, $n);
}

/** Süresi dolanları ve yeterince "yok" oyu alan kullanıcı bildirimlerini temizler */
function cleanup(bool $force = false): void {
    if (!$force && random_int(1, 50) !== 1) return;
    $db = db(); $now = nowMs(); $hide = (int) setting('hide_after');
    $cond = "(expires_at IS NOT NULL AND expires_at < $now) OR (source = 'user' AND denials - confirmations >= $hide)";
    $db->exec("DELETE FROM votes WHERE hazard_id IN (SELECT id FROM hazards WHERE $cond)");
    $db->exec("DELETE FROM hazards WHERE $cond");
    $db->exec('DELETE FROM login_fail WHERE at < ' . ($now - 86400000));
    $db->exec('DELETE FROM speed_samples WHERE at < ' . ($now - 86400000));
}

/** Geohash (7 hane ≈ 150 m x 150 m) */
function geohash(float $lat, float $lon, int $prec = 7): string {
    $b32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    $la = [-90.0, 90.0]; $lo = [-180.0, 180.0]; $out = ''; $bit = 0; $ch = 0; $even = true;
    while (strlen($out) < $prec) {
        if ($even) { $mid = ($lo[0] + $lo[1]) / 2; if ($lon >= $mid) { $ch = $ch * 2 + 1; $lo[0] = $mid; } else { $ch *= 2; $lo[1] = $mid; } }
        else { $mid = ($la[0] + $la[1]) / 2; if ($lat >= $mid) { $ch = $ch * 2 + 1; $la[0] = $mid; } else { $ch *= 2; $la[1] = $mid; } }
        $even = !$even;
        if (++$bit === 5) { $out .= $b32[$ch]; $bit = 0; $ch = 0; }
    }
    return $out;
}
