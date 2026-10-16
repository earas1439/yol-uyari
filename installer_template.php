<?php
/**
 * Yol Uyarı – Kurulum sihirbazı
 * Bu tek dosyayı hostingde sitenin kurulacağı klasöre yükle (ör. public_html)
 * ve tarayıcıda aç: https://alanadin.com/kurulum.php
 * Kurulum bitince bu dosya kendini siler.
 */
declare(strict_types=1);
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');
@set_time_limit(120);
session_start();

const APP_VERSION = '__VERSION__';
const RADAR_URL = 'https://raw.githubusercontent.com/earas1439/yol-uyari/main/data/radars-tr.json';
// Gömülü dosyalar: yol => base64 içerik
$FILES = /*__FILES__*/[];

$ROOT = __DIR__;
$API_CFG = $ROOT . '/api/config.php';

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

function siteUrl(): string {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return ($https ? 'https' : 'http') . '://' . $host . $dir . '/';
}

function httpGet(string $url, int $timeout = 15): array {
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_USERAGENT => 'yol-uyari-kurulum', CURLOPT_SSL_VERIFYPEER => true]);
        $body = curl_exec($c);
        $code = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
        curl_close($c);
        return [$code, $body === false ? '' : (string) $body];
    }
    if (ini_get('allow_url_fopen')) {
        $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'ignore_errors' => true, 'header' => "User-Agent: yol-uyari-kurulum\r\n"]]);
        $body = @file_get_contents($url, false, $ctx);
        $code = 0;
        foreach ($http_response_header ?? [] as $line) if (preg_match('#^HTTP/\S+\s+(\d+)#', $line, $m)) $code = (int) $m[1];
        return [$code, $body === false ? '' : (string) $body];
    }
    return [0, ''];
}

function checks(string $root): array {
    $c = [];
    $c[] = ['PHP sürümü ' . PHP_VERSION, version_compare(PHP_VERSION, '7.4.0', '>='), 'PHP 7.4 veya üstü gerekli. Hosting panelinden PHP sürümünü yükselt.', true];
    $c[] = ['PDO SQLite', extension_loaded('pdo_sqlite'), 'SQLite yok. MySQL seçeneğini kullan ya da hosting panelinden pdo_sqlite eklentisini aç.', false];
    $c[] = ['PDO MySQL', extension_loaded('pdo_mysql'), 'MySQL eklentisi yok (SQLite kullanılacaksa gerekmez).', false];
    $c[] = ['JSON', function_exists('json_encode'), 'JSON eklentisi gerekli.', true];
    $c[] = ['Klasöre yazma izni', is_writable($root), 'Bu klasöre dosya yazılamıyor. Dosya yöneticisinden klasör iznini 755 yap.', true];
    $c[] = ['İnternete erişim (radar listesi için)', function_exists('curl_init') || ini_get('allow_url_fopen'), 'Sunucu dışarıya bağlanamıyor; radar listesi gömülü kopyadan kurulur.', false];
    $c[] = ['HTTPS', strpos(siteUrl(), 'https://') === 0, 'Site http ile açıldı. Telefonda konum yalnızca https adreste çalışır. Hosting panelinden ücretsiz SSL\'i (AutoSSL / Let\'s Encrypt) aç ve https:// ile tekrar gir.', false];
    return $c;
}

function writeFile(string $path, string $data): void {
    $dir = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new RuntimeException("Klasör oluşturulamadı: $dir");
    if (@file_put_contents($path, $data, LOCK_EX) === false) throw new RuntimeException("Dosya yazılamadı: $path");
}

$step = 'form';
$errors = [];
$result = [];

$cfgText = is_file($API_CFG) ? (string) @file_get_contents($API_CFG) : '';
if (strpos($cfgText, "'installed'") !== false && strpos($cfgText, "'admin_hash'") !== false && ($_GET['force'] ?? '') !== '1') {
    $step = 'already';
}

if ($step === 'form' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!hash_equals($_SESSION['yu_csrf'] ?? '', $_POST['csrf'] ?? '')) {
        $errors[] = 'Oturum süresi doldu, sayfayı yenileyip tekrar dene.';
    } else {
        $dbType = ($_POST['db'] ?? 'sqlite') === 'mysql' ? 'mysql' : 'sqlite';
        $old = is_file($API_CFG) ? (include $API_CFG) : [];
        if (!is_array($old)) $old = [];
        $cfg = ['installed' => date('c'), 'version' => APP_VERSION];
        try {
            // Yönetici hesabı (yeniden kurulumda boş bırakılırsa eskisi korunur)
            $au = trim((string) ($_POST['admin_user'] ?? ''));
            $ap = (string) ($_POST['admin_pass'] ?? '');
            if ($ap !== '' || empty($old['admin_hash'])) {
                if (!preg_match('/^[A-Za-z0-9_.@-]{3,40}$/', $au)) throw new RuntimeException('Yönetici kullanıcı adı 3-40 karakter olmalı (harf, rakam, . _ - @).');
                if (strlen($ap) < 8) throw new RuntimeException('Yönetici şifresi en az 8 karakter olmalı.');
                if ($ap !== (string) ($_POST['admin_pass2'] ?? '')) throw new RuntimeException('Yönetici şifreleri aynı değil.');
                $cfg['admin_user'] = $au; $cfg['admin_hash'] = password_hash($ap, PASSWORD_DEFAULT);
            } else {
                $cfg['admin_user'] = $old['admin_user']; $cfg['admin_hash'] = $old['admin_hash'];
            }
            if ($dbType === 'mysql') {
                $host = trim($_POST['my_host'] ?? 'localhost') ?: 'localhost';
                $name = trim($_POST['my_name'] ?? '');
                $user = trim($_POST['my_user'] ?? '');
                $pass = (string) ($_POST['my_pass'] ?? '');
                if ($name === '' || $user === '') throw new RuntimeException('MySQL için veritabanı adı ve kullanıcı adı gerekli.');
                $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";
                new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 8]);
                $cfg += ['mysql_dsn' => $dsn, 'mysql_user' => $user, 'mysql_pass' => $pass];
            } else {
                if (!extension_loaded('pdo_sqlite')) throw new RuntimeException('Bu sunucuda SQLite yok. MySQL seçeneğini kullan.');
                // Yeniden kurulumda eski veritabanını koru
                $cfg['sqlite_file'] = (!empty($old['sqlite_file'])) ? basename((string) $old['sqlite_file'])
                    : 'yu_' . bin2hex(random_bytes(10)) . '.sqlite';
            }

            // 1) Dosyaları yaz
            foreach ($FILES as $rel => $b64) {
                if ($rel === 'api/config.php') continue;
                writeFile($ROOT . '/' . $rel, base64_decode($b64));
            }
            @mkdir($ROOT . '/api/data', 0755, true);
            writeFile($API_CFG, "<?php\n// Kurulum sihirbazı tarafından oluşturuldu. Bu dosyayı paylaşma.\nreturn " . var_export($cfg, true) . ";\n");
            $result[] = count($FILES) . ' dosya kuruldu';

            // 2) Güncel radar listesi
            if (!empty($_POST['radar'])) {
                [$code, $body] = httpGet(RADAR_URL, 30);
                $js = $code === 200 ? json_decode($body, true) : null;
                if (is_array($js) && !empty($js['elements'])) {
                    writeFile($ROOT . '/data/radars-tr.json', $body);
                    $result[] = 'Güncel Türkiye radar listesi indirildi (' . count($js['elements']) . ' kayıt)';
                } else {
                    $result[] = 'Radar listesi indirilemedi; uygulama açılınca GitHub\'dan kendisi alacak';
                }
            }

            // 3) Sunucuyu dene (veritabanı ilk istekte oluşur)
            [$code, $body] = httpGet(siteUrl() . 'api/?action=ping', 15);
            $ping = json_decode($body, true);
            if ($code === 200 && ($ping['app'] ?? '') === 'yol-uyari') {
                $result[] = 'Sunucu çalışıyor, veritabanı hazır';
            } else {
                // Bazı hostingler sitenin kendine bağlanmasına izin vermez; veritabanı ilk kullanımda oluşur
                $result[] = 'Sunucu kendi kendini test edemedi (hosting kısıtı olabilir); site açılınca kontrol et';
            }

            // 4) Güvenlik: veritabanı dosyası dışarıdan indirilebiliyor mu?
            if ($dbType === 'sqlite') {
                [$code] = httpGet(siteUrl() . 'api/data/' . $cfg['sqlite_file'], 8);
                $result[] = $code === 200
                    ? 'UYARI: Sunucun .htaccess dosyalarını desteklemiyor; veritabanı dosya adı tahmin edilemez yapıldı'
                    : 'Veritabanı dosyası dışarıya kapalı';
            }

            // 5) Kendini sil
            $self = @unlink(__FILE__);
            $result[] = $self ? 'Kurulum dosyası silindi' : 'Kurulum dosyası silinemedi: kurulum.php dosyasını dosya yöneticisinden sil!';
            $step = 'done';
        } catch (Throwable $e) {
            $errors[] = $e->getMessage();
        }
    }
}

$_SESSION['yu_csrf'] = $_SESSION['yu_csrf'] ?? bin2hex(random_bytes(16));
$checks = checks($ROOT);
$blocking = array_filter($checks, fn($c) => $c[3] && !$c[1]);
$existing = array_values(array_filter(array_keys($FILES), fn($p) => is_file($ROOT . '/' . $p) && $p !== 'api/config.php'));
$url = siteUrl();
?><!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Yol Uyarı Kurulum</title>
<style>
:root{--bg:#111A20;--panel:#182129;--line:#2E3B46;--fg:#EAF0F4;--muted:#8C9BA8;--accent:#FF8A1F;--ok:#2FBF71;--bad:#E5484D;--warn:#E9A913;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px max(16px,env(safe-area-inset-right)) 40px max(16px,env(safe-area-inset-left))}
main{max-width:620px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
h1{margin:0;font-size:30px;letter-spacing:.01em}
h1 small{display:block;font-size:14px;font-weight:500;color:var(--muted);letter-spacing:0}
h2{margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}
.row{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:0}
.st{width:22px;height:22px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:700;font-size:13px;color:#08110C;margin-top:1px}
.ok{background:var(--ok)} .bad{background:var(--bad);color:#fff} .warn{background:var(--warn)}
.row small{display:block;color:var(--muted)}
label{display:block}
.opt{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;cursor:pointer}
.opt input{margin-top:4px}
.opt small{display:block;color:var(--muted)}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 8px}
.fields input{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px;color:var(--fg);font:inherit}
@media (max-width:480px){.fields{grid-template-columns:1fr}}
button{width:100%;border:0;border-radius:12px;padding:15px;font:inherit;font-weight:700;font-size:17px;background:var(--accent);color:#1A0E02;cursor:pointer}
button:disabled{background:var(--line);color:var(--muted);cursor:not-allowed}
.err{background:#3A1517;border:1px solid var(--bad);border-radius:12px;padding:12px}
a{color:var(--accent)}
code{background:var(--bg);padding:2px 6px;border-radius:6px;word-break:break-all}
.big{font-size:18px;font-weight:600}
ol{margin:0;padding-left:20px}
</style>
</head>
<body>
<main>
<h1>Yol Uyarı <small>Kurulum sihirbazı · sürüm <?= h(APP_VERSION) ?></small></h1>

<?php if ($step === 'already'): ?>
  <div class="card">
    <p class="big">Yol Uyarı bu klasörde zaten kurulu.</p>
    <p>Site: <a href="<?= h($url) ?>"><?= h($url) ?></a></p>
    <p>Güvenlik için <code>kurulum.php</code> dosyasını dosya yöneticisinden sil.</p>
    <p style="color:var(--muted)">Yeniden kurmak (dosyaları güncellemek) istersen: <a href="?force=1">yeniden kur</a>. Mevcut bildirimler silinmez, ama veritabanı ayarı yeniden seçilir.</p>
  </div>

<?php elseif ($step === 'done'): ?>
  <div class="card">
    <p class="big">Kurulum tamamlandı.</p>
    <?php foreach ($result as $r): $isWarn = stripos($r, 'UYARI') === 0 || stripos($r, 'silinemedi') !== false || stripos($r, 'edemedi') !== false || stripos($r, 'indirilemedi') !== false; ?>
      <div class="row"><span class="st <?= $isWarn ? 'warn' : 'ok' ?>"><?= $isWarn ? '!' : '✓' ?></span><div><?= h($r) ?></div></div>
    <?php endforeach; ?>
  </div>
  <div class="card">
    <h2>Şimdi</h2>
    <ol>
      <li>Siteyi telefonda Chrome ile aç: <a href="<?= h($url) ?>"><?= h($url) ?></a></li>
      <li>Başlangıç ekranında <b>"Canlı mod (kendi sunucun)"</b> yazısını gör, <b>Sürüşü başlat</b>'a bas.</li>
      <li>Yönetim paneli: <a href="<?= h($url) ?>admin/"><?= h($url) ?>admin/</a> — kurulumda belirlediğin kullanıcı adı ve şifreyle gir.</li>
      <li>Çevrimdışı harita için: GitHub'da <b>Actions → Türkiye Haritasını Üret</b> işlemini bir kez çalıştır, sonra panelde <b>Ayarlar → Harita dosyası → Sunucuya indir</b>.</li>
      <li>Android uygulamasının bu adresi açması için adresi Claude'a söyle: <code><?= h($url) ?></code></li>
    </ol>
  </div>

<?php else: ?>
  <?php foreach ($errors as $e): ?><div class="err"><?= h($e) ?></div><?php endforeach; ?>

  <div class="card">
    <h2>Sunucu kontrolü</h2>
    <?php foreach ($checks as [$name, $ok, $hint, $required]): ?>
      <div class="row">
        <span class="st <?= $ok ? 'ok' : ($required ? 'bad' : 'warn') ?>"><?= $ok ? '✓' : ($required ? '✕' : '!') ?></span>
        <div><?= h($name) ?><?php if (!$ok): ?><small><?= h($hint) ?></small><?php endif; ?></div>
      </div>
    <?php endforeach; ?>
  </div>

  <form method="post" class="card" id="f">
    <input type="hidden" name="csrf" value="<?= h($_SESSION['yu_csrf']) ?>">
    <h2>Veritabanı</h2>
    <label class="opt"><input type="radio" name="db" value="sqlite" <?= extension_loaded('pdo_sqlite') ? 'checked' : 'disabled' ?>>
      <span><b>SQLite (önerilen)</b><small>Hiçbir şey girmen gerekmez; veritabanı dosyası kendiliğinden oluşur.</small></span></label>
    <label class="opt"><input type="radio" name="db" value="mysql" <?= extension_loaded('pdo_sqlite') ? '' : 'checked' ?> <?= extension_loaded('pdo_mysql') ? '' : 'disabled' ?>>
      <span><b>MySQL</b><small>Hosting panelinden önce bir veritabanı ve kullanıcı oluştur.</small></span></label>
    <div class="fields" id="my">
      <input name="my_host" placeholder="Sunucu (genelde localhost)" value="localhost" aria-label="MySQL sunucu">
      <input name="my_name" placeholder="Veritabanı adı" aria-label="Veritabanı adı">
      <input name="my_user" placeholder="Kullanıcı adı" aria-label="Kullanıcı adı">
      <input name="my_pass" type="password" placeholder="Şifre" aria-label="Şifre">
    </div>
    <h2>Yönetici hesabı</h2>
    <?php $hasAdmin = is_file($API_CFG) && strpos((string) @file_get_contents($API_CFG), 'admin_hash') !== false; ?>
    <p style="color:var(--muted);margin:0 0 8px">Yönetim paneline (alanadin.com/admin) bu bilgilerle girersin.<?= $hasAdmin ? ' Mevcut hesabı korumak için boş bırak.' : '' ?></p>
    <div class="fields">
      <input name="admin_user" placeholder="Kullanıcı adı" autocomplete="username" aria-label="Yönetici kullanıcı adı" <?= $hasAdmin ? '' : 'required' ?>>
      <span></span>
      <input name="admin_pass" type="password" placeholder="Şifre (en az 8 karakter)" autocomplete="new-password" aria-label="Yönetici şifresi" <?= $hasAdmin ? '' : 'required minlength="8"' ?>>
      <input name="admin_pass2" type="password" placeholder="Şifre (tekrar)" autocomplete="new-password" aria-label="Yönetici şifresi tekrar" <?= $hasAdmin ? '' : 'required minlength="8"' ?>>
    </div>
    <h2>Seçenekler</h2>
    <label class="opt"><input type="checkbox" name="radar" value="1" checked>
      <span><b>Güncel Türkiye radar listesini indir</b><small>GitHub'daki haftalık güncellenen liste.</small></span></label>
    <?php if ($existing): ?>
      <label class="opt"><input type="checkbox" id="ow" required>
        <span><b>Mevcut dosyaların üzerine yaz</b><small>Bu klasörde zaten şunlar var: <?= h(implode(', ', array_slice($existing, 0, 6))) ?><?= count($existing) > 6 ? '…' : '' ?></small></span></label>
    <?php endif; ?>
    <p style="color:var(--muted);margin:4px 0 12px">Kurulacak adres: <code><?= h($url) ?></code></p>
    <button type="submit" <?= $blocking ? 'disabled' : '' ?>>Kur</button>
  </form>
  <script>
    const f=document.getElementById('f'), my=document.getElementById('my');
    const sync=()=>{ my.hidden = f.db.value!=='mysql'; };
    f.addEventListener('change',sync); sync();
    f.addEventListener('submit',()=>{ const b=f.querySelector('button'); b.textContent='Kuruluyor…'; setTimeout(()=>b.disabled=true,0); });
  </script>
<?php endif; ?>
</main>
</body>
</html>
