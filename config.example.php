<?php
// MySQL kullanmak istersen bu dosyayı config.php adıyla kopyala ve doldur.
// Boş bırakırsan (ya da config.php yoksa) SQLite kullanılır; hiçbir kurulum gerekmez.
return [
    'mysql_dsn'  => 'mysql:host=localhost;dbname=VERITABANI_ADI;charset=utf8mb4',
    'mysql_user' => 'KULLANICI',
    'mysql_pass' => 'SIFRE',
];
