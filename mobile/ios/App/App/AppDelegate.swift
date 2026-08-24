import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Face ID zorunluluğu kaldırıldı: açılışta kilit yok.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Kısa kesinti / app-switcher: hassas veriyi gizlemek için örtüyü göster.
        BiometricLock.shared.showPrivacyCover()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Kilit yok; yalnızca app-switcher önizlemesinde veriyi gizle.
        BiometricLock.shared.showPrivacyCover()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Öne dönüldüğünde gerekiyorsa Face ID / Touch ID ile doğrula.
        BiometricLock.shared.authenticateIfNeeded()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // @capacitor/push-notifications zorunlu köprüsü: native APNs sonucunu
    // (token ya da hata) Capacitor'a iletir. Bu olmadan JS tarafı
    // "registration"/"registrationError" olaylarını hiç almaz.
    // https://github.com/ionic-team/capacitor-plugins/blob/main/push-notifications/README.md
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}
