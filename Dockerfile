# Render.com, Railway, Fly.io veya herhangi bir Docker sunucusu için.
# Sayfa + api/ tek kapta çalışır. Render: New > Web Service > bu depo > Docker.
# DİKKAT: Ücretsiz planlarda disk kalıcı değildir; SQLite verisi yeniden başlatmada silinir.
# Kalıcılık için ya kalıcı disk ekle (mount: /var/www/html/api/data) ya da api/config.php ile MySQL kullan.
FROM php:8.3-apache

RUN a2enmod headers \
 && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
 && sed -i 's/Listen 80/Listen ${PORT}/' /etc/apache2/ports.conf \
 && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/' /etc/apache2/sites-available/000-default.conf

ENV PORT=10000
COPY index.html app.js sw.js manifest.json icon-192.png icon-512.png /var/www/html/
COPY lib /var/www/html/lib
COPY admin /var/www/html/admin
COPY data /var/www/html/data
COPY api /var/www/html/api
RUN mkdir -p /var/www/html/api/data /var/www/html/tiles && chown -R www-data:www-data /var/www/html/api/data /var/www/html/tiles

EXPOSE 10000
