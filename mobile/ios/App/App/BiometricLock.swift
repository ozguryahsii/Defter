import UIKit
import LocalAuthentication

/// SOBSO! finans verisi içerdiği için uygulama, açılışta ve arka plandan
/// dönüşte Face ID / Touch ID (ya da cihaz şifresi) ile kilitlenir.
/// Ayrıca uygulama arka plana alınırken içerik bir örtüyle gizlenir; böylece
/// uygulama değiştiricideki (app switcher) önizlemede hassas veri görünmez.
///
/// Tamamen native tarafta çalışır; uzaktaki web içeriğine bağımlı değildir.
final class BiometricLock {

    static let shared = BiometricLock()
    private init() {}

    private var overlayWindow: UIWindow?
    private var isAuthenticating = false
    /// true iken içerik kilitlidir ve kimlik doğrulama gerekir.
    /// Varsayılan false: açılışta Face ID zorunlu değildir; yalnızca
    /// app-switcher önizlemesinde gizlilik örtüsü gösterilir.
    private var needsAuth = false

    // MARK: - Yaşam döngüsü kancaları

    /// Açılış ve arka plana geçişte çağrılır: kilitle + örtüyü göster.
    func lock() {
        needsAuth = true
        showOverlay(locked: true)
    }

    /// Kısa kesintilerde (Kontrol Merkezi, bildirim gölgesi) gizlilik örtüsü.
    func showPrivacyCover() {
        showOverlay(locked: needsAuth)
    }

    /// Öne dönüldüğünde: gerekiyorsa doğrula, gerekmiyorsa örtüyü kaldır.
    func authenticateIfNeeded() {
        if needsAuth {
            authenticate()
        } else {
            hideOverlay()
        }
    }

    // MARK: - Kimlik doğrulama

    func authenticate() {
        guard needsAuth, !isAuthenticating else { return }

        let context = LAContext()
        context.localizedFallbackTitle = "Şifreyle Aç"

        // Biyometri + cihaz şifresi (biyometri yoksa şifreye düşer).
        let policy: LAPolicy = .deviceOwnerAuthentication
        var error: NSError?
        guard context.canEvaluatePolicy(policy, error: &error) else {
            // Cihazda şifre/biyometri yoksa kullanıcıyı kilitli bırakma.
            needsAuth = false
            hideOverlay()
            return
        }

        isAuthenticating = true
        setLockUI(showButton: false) // "doğrulanıyor" durumu

        context.evaluatePolicy(
            policy,
            localizedReason: "SOBSO! hesabına erişmek için kimliğini doğrula"
        ) { [weak self] success, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isAuthenticating = false
                if success {
                    self.needsAuth = false
                    self.hideOverlay()
                } else {
                    // Başarısız/iptal: kilitli kal, tekrar dene butonunu göster.
                    self.setLockUI(showButton: true)
                }
            }
        }
    }

    // MARK: - Örtü penceresi

    private func showOverlay(locked: Bool) {
        if overlayWindow == nil {
            let window: UIWindow
            if let scene = activeScene() {
                window = UIWindow(windowScene: scene)
            } else {
                window = UIWindow(frame: UIScreen.main.bounds)
            }
            window.windowLevel = .alert + 1
            let vc = LockViewController()
            vc.onUnlockTapped = { [weak self] in self?.authenticate() }
            window.rootViewController = vc
            window.makeKeyAndVisible()
            overlayWindow = window
        }
        setLockUI(showButton: locked && !isAuthenticating)
    }

    private func hideOverlay() {
        overlayWindow?.isHidden = true
        overlayWindow = nil
    }

    private func setLockUI(showButton: Bool) {
        (overlayWindow?.rootViewController as? LockViewController)?.setUnlockButtonVisible(showButton)
    }

    private func activeScene() -> UIWindowScene? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive }
    }
}

/// Kilit ekranı: bulanık arka plan + logo + "Face ID ile Aç" butonu.
final class LockViewController: UIViewController {

    var onUnlockTapped: (() -> Void)?
    private let unlockButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.035, green: 0.035, blue: 0.043, alpha: 1) // #09090b

        let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemChromeMaterialDark))
        blur.frame = view.bounds
        blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(blur)

        let title = UILabel()
        title.text = "SOBSO!"
        title.textColor = .white
        title.font = .systemFont(ofSize: 34, weight: .bold)
        title.translatesAutoresizingMaskIntoConstraints = false

        let lockIcon = UIImageView(image: UIImage(systemName: "lock.fill"))
        lockIcon.tintColor = .white
        lockIcon.contentMode = .scaleAspectFit
        lockIcon.translatesAutoresizingMaskIntoConstraints = false

        unlockButton.setTitle("Face ID ile Aç", for: .normal)
        unlockButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        unlockButton.setTitleColor(.white, for: .normal)
        unlockButton.backgroundColor = UIColor(red: 0.34, green: 0.31, blue: 0.95, alpha: 1)
        unlockButton.layer.cornerRadius = 12
        unlockButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 28, bottom: 14, right: 28)
        unlockButton.translatesAutoresizingMaskIntoConstraints = false
        unlockButton.addTarget(self, action: #selector(unlockPressed), for: .touchUpInside)

        view.addSubview(lockIcon)
        view.addSubview(title)
        view.addSubview(unlockButton)

        NSLayoutConstraint.activate([
            lockIcon.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            lockIcon.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -60),
            lockIcon.widthAnchor.constraint(equalToConstant: 48),
            lockIcon.heightAnchor.constraint(equalToConstant: 48),

            title.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            title.topAnchor.constraint(equalTo: lockIcon.bottomAnchor, constant: 20),

            unlockButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            unlockButton.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 40),
        ])
    }

    func setUnlockButtonVisible(_ visible: Bool) {
        loadViewIfNeeded()
        unlockButton.isHidden = !visible
    }

    @objc private func unlockPressed() {
        onUnlockTapped?()
    }
}
