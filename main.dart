import 'dart:async';
import 'dart:convert';

import 'package:audio_session/audio_session.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

/// Arayüz bu adresten yüklenir (GitHub Pages). Web sürümü güncellenince
/// uygulama da kendiliğinden güncellenir; APK'yı yeniden kurmak gerekmez.
/// Depo adın farklıysa burayı değiştir.
const kAppUrl = 'https://earas1439.github.io/yol-uyari/';

const _bg = Color(0xFF111A20);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: _bg,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: _bg,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const YolUyariApp());
}

class YolUyariApp extends StatelessWidget {
  const YolUyariApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Yol Uyarı',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          colorSchemeSeed: Colors.orange,
          useMaterial3: true,
          scaffoldBackgroundColor: _bg,
        ),
        home: const ShellScreen(),
      );
}

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  InAppWebViewController? _web;
  final NativeVoice _voice = NativeVoice();
  StreamSubscription<Position>? _posSub;
  bool _loading = true;
  bool _loadError = false;

  @override
  void initState() {
    super.initState();
    _voice.init();
  }

  @override
  void dispose() {
    _posSub?.cancel();
    WakelockPlus.disable();
    super.dispose();
  }

  // ---------------- Konum (ön plan servisi: ekran kapalıyken de çalışır) ----------------

  Future<String> _startTracking() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return 'Telefonun konum servisi kapalı. Bildirim panelinden Konum\'u açın.';
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever) {
      return 'Konum izni kapalı. Ayarlar > Uygulamalar > Yol Uyarı > İzinler > Konum bölümünden izin verin.';
    }
    if (perm == LocationPermission.denied) {
      return 'Uygulamanın çalışması için konum izni gerekli.';
    }
    try {
      await WakelockPlus.enable();
    } catch (_) {}
    _posSub ??= Geolocator.getPositionStream(locationSettings: _locationSettings())
        .listen(_onPosition, onError: (Object e) {
      _js('window.YU&&YU.nativeError(${jsonEncode('Konum alınamıyor: $e')})');
    });
    return 'ok';
  }

  LocationSettings _locationSettings() {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return AndroidSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 0,
        intervalDuration: const Duration(seconds: 1),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'Yol Uyarı çalışıyor',
          notificationText: 'Radar ve tehlike uyarıları açık',
          enableWakeLock: true,
        ),
      );
    }
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        activityType: ActivityType.automotiveNavigation,
        distanceFilter: 0,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
        allowBackgroundLocationUpdates: true,
      );
    }
    return const LocationSettings(accuracy: LocationAccuracy.high);
  }

  String _n(double v) => v.isFinite ? v.toString() : 'null';

  void _onPosition(Position p) {
    _js('window.YU&&YU.nativeFix(${_n(p.latitude)},${_n(p.longitude)},${_n(p.accuracy)},'
        '${_n(p.speed)},${_n(p.heading)},${p.timestamp.millisecondsSinceEpoch})');
  }

  void _js(String source) {
    final web = _web;
    if (web == null) return;
    web.evaluateJavascript(source: source).catchError((Object _) => null);
  }

  // ---------------- Arayüz ----------------

  void _retry() {
    setState(() {
      _loadError = false;
      _loading = true;
    });
    _web?.reload();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // geri tuşu uygulamayı kapatmasın; ana ekran tuşuyla arka plana alınır, uyarılar sürer
      child: Scaffold(
        backgroundColor: _bg,
        body: SafeArea(
          child: Stack(
            children: [
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri(kAppUrl)),
                initialSettings: InAppWebViewSettings(
                  javaScriptEnabled: true,
                  mediaPlaybackRequiresUserGesture: false,
                  supportZoom: false,
                  useHybridComposition: true,
                  transparentBackground: false,
                  cacheMode: CacheMode.LOAD_DEFAULT,
                  geolocationEnabled: true,
                ),
                onWebViewCreated: (controller) {
                  _web = controller;
                  controller.addJavaScriptHandler(
                    handlerName: 'speak',
                    callback: (List<dynamic> args) {
                      final text = args.isNotEmpty ? args[0].toString() : '';
                      if (text.isNotEmpty) _voice.say(text);
                      return true;
                    },
                  );
                  controller.addJavaScriptHandler(
                    handlerName: 'startTracking',
                    callback: (List<dynamic> args) => _startTracking(),
                  );
                },
                onLoadStop: (controller, url) {
                  if (mounted) setState(() => _loading = false);
                },
                onReceivedError: (controller, request, error) {
                  if (request.isForMainFrame ?? true) {
                    if (mounted) {
                      setState(() {
                        _loadError = true;
                        _loading = false;
                      });
                    }
                  }
                },
                onGeolocationPermissionsShowPrompt: (controller, origin) async =>
                    GeolocationPermissionShowPromptResponse(origin: origin, allow: true, retain: true),
              ),
              if (_loading)
                const ColoredBox(
                  color: _bg,
                  child: Center(child: CircularProgressIndicator(color: Colors.orange)),
                ),
              if (_loadError)
                ColoredBox(
                  color: _bg,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.wifi_off, size: 56, color: Colors.white70),
                          const SizedBox(height: 16),
                          const Text(
                            'İnternet bağlantısı yok',
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Harita ve uyarılar için internet gerekli. Bağlantını kontrol edip tekrar dene.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white70),
                          ),
                          const SizedBox(height: 20),
                          FilledButton(onPressed: _retry, child: const Text('Tekrar dene')),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Telefonun kendi Türkçe sesi. Konuşurken müziğin sesini kısar (ducking),
/// ekran kapalıyken de çalışır. Konuşmalar sırayla okunur.
class NativeVoice {
  final FlutterTts _tts = FlutterTts();
  AudioSession? _session;
  Future<void> _queue = Future<void>.value();

  Future<void> init() async {
    try {
      final session = await AudioSession.instance;
      await session.configure(const AudioSessionConfiguration(
        avAudioSessionCategory: AVAudioSessionCategory.playback,
        avAudioSessionCategoryOptions: AVAudioSessionCategoryOptions.duckOthers,
        avAudioSessionMode: AVAudioSessionMode.voicePrompt,
        androidAudioAttributes: AndroidAudioAttributes(
          contentType: AndroidAudioContentType.speech,
          usage: AndroidAudioUsage.assistanceNavigationGuidance,
        ),
        androidAudioFocusGainType: AndroidAudioFocusGainType.gainTransientMayDuck,
        androidWillPauseWhenDucked: false,
      ));
      _session = session;
    } catch (_) {}
    try {
      await _tts.setLanguage('tr-TR');
      await _tts.setSpeechRate(0.5);
      await _tts.setVolume(1.0);
      await _tts.awaitSpeakCompletion(true);
    } catch (_) {}
  }

  Future<void> say(String text) {
    _queue = _queue.then((_) => _speak(text)).catchError((Object _) {});
    return _queue;
  }

  Future<void> _speak(String text) async {
    try {
      await _session?.setActive(true);
    } catch (_) {}
    try {
      await _tts.speak(text);
    } catch (_) {}
    try {
      await _session?.setActive(false);
    } catch (_) {}
  }
}
