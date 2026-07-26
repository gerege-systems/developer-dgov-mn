// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import SwiftUI

// Нэвтрэх эхлэл — Gerege SSO. Нэвтрэлт бүхэлдээ template BFF-ээр дамжина
// (апп нь SSO дээр өөрийн client бүртгүүлэхгүй, вэбийн урсгалыг ашиглана).
struct LoginView: View {
    @EnvironmentObject var state: AppState
    @State private var showSSO = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "shield.checkerboard")
                        .font(.system(size: 56))
                        .foregroundStyle(.blue)
                    Text("Gerege Template Platform V3.0")
                        .font(.largeTitle.bold())
                    Text("Gerege SSO-гоор нэвтэрнэ үү")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    showSSO = true
                } label: {
                    Label("Gerege SSO-гоор нэвтрэх", systemImage: "globe")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
            .sheet(isPresented: $showSSO) {
                NavigationStack {
                    SSOWebView {
                        showSSO = false
                        Task { await state.onAuthenticated() }
                    }
                    .ignoresSafeArea(edges: .bottom)
                    .navigationTitle("Gerege SSO")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Хаах") { showSSO = false }
                        }
                    }
                }
            }
        }
    }
}
