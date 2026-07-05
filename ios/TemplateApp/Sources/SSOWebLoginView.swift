// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import SwiftUI
import WebKit

// Gerege SSO (OIDC) нэвтрэлт — BFF /api/auth/sso/start-ийг WKWebView-д ачаалж,
// sso.gerege.mn дээр иргэнийг баталгаажуулна. Урсгал дуусаад template.gerege.mn/me*
// руу буцахад cookie (gerege_access/refresh) суусан байх тул түүнийг WKWebView-ээс
// HTTPCookieStorage.shared руу хуулж, URLSession (APIClient)-д ашиглана.
struct SSOWebLoginView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            SSOWebView(onDone: { success in
                if success {
                    Task { await state.onAuthenticated(); dismiss() }
                } else {
                    dismiss()
                }
            })
            .ignoresSafeArea(edges: .bottom)
            .navigationTitle("Gerege SSO")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Болих") { dismiss() }
                }
            }
        }
    }
}

private struct SSOWebView: UIViewRepresentable {
    let onDone: (Bool) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onDone: onDone) }

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        let web = WKWebView(frame: .zero, configuration: cfg)
        web.navigationDelegate = context.coordinator
        let url = APIClient.baseURL.appendingPathComponent("/api/auth/sso/start")
        web.load(URLRequest(url: url))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        let onDone: (Bool) -> Void
        private var finished = false
        init(onDone: @escaping (Bool) -> Void) { self.onDone = onDone }

        // template.gerege.mn/me* руу шилжих гэж байна = SSO амжилттай (cookie
        // /sso/callback дээр суусан). Web dashboard-ыг рендэрлэхгүйн тулд энэ
        // navigation-ыг ТАСЛАЖ, cookie-г URLSession руу хуулаад апп руу дуусгана.
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if !finished, let url = navigationAction.request.url,
               url.host?.hasSuffix("template.gerege.mn") == true, url.path.hasPrefix("/me") {
                finished = true
                decisionHandler(.cancel) // web dashboard-ыг ачаалахгүй
                webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
                    for c in cookies where c.domain.contains("gerege.mn") {
                        HTTPCookieStorage.shared.setCookie(c)
                    }
                    DispatchQueue.main.async { self.onDone(true) }
                }
                return
            }
            decisionHandler(.allow)
        }
    }
}
