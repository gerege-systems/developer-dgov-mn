// Gerege Template Version 27.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

import SwiftUI
import CoreImage.CIFilterBuiltins

// eID нэвтрэлт — РД (утас руу push) эсвэл QR (тусдаа утсаар уншуулна). Хоёул
// backend session үүсгээд browser/апп ~2.5с тутам poll хийж COMPLETE-ийг хүлээнэ.
struct EIDLoginView: View {
    enum Method: String, CaseIterable { case id = "РД", qr = "QR код" }
    enum Phase { case idle, starting, waiting, expired, refused, error }

    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var method: Method = .id
    @State private var phase: Phase = .idle
    @State private var nationalID = ""
    @State private var start: EidStart?
    @State private var pollTask: Task<Void, Never>?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Picker("", selection: $method) {
                    ForEach(Method.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .onChange(of: method) { _ in reset(); if method == .qr { beginQR() } }

                if method == .id && phase != .waiting {
                    idForm
                }

                if phase == .starting {
                    ProgressView("Бэлдэж байна…").padding()
                }

                if phase == .waiting, let s = start {
                    waitingCard(s)
                }

                switch phase {
                case .expired: notice("Хүсэлтийн хугацаа дууссан.", retry: true)
                case .refused: notice("Нэвтрэх хүсэлт цуцлагдсан.", retry: true)
                case .error: notice("Алдаа гарлаа. Дахин оролдоно уу.", retry: true)
                default: EmptyView()
                }
            }
            .padding(20)
        }
        .navigationTitle("eID нэвтрэлт")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { pollTask?.cancel() }
    }

    // MARK: - Subviews

    private var idForm: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("РД эсвэл иргэний бүртгэлийн дугаараа оруулна уу. Утсан дээрх Gerege App-д мэдэгдэл ирнэ.")
                .font(.footnote).foregroundStyle(.secondary)
            TextField("АА00000000", text: $nationalID)
                .textFieldStyle(.roundedBorder)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.characters)
                .font(.title3.monospaced())
            Button {
                beginID()
            } label: {
                Text("Нэвтрэх").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(nationalID.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private func waitingCard(_ s: EidStart) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "iphone.gen3.radiowaves.left.and.right")
                .font(.system(size: 40)).foregroundStyle(.blue)
            Text("Утсаараа баталгаажуулна уу").font(.headline)

            if method == .qr, let link = s.deviceLinkUrl, let img = Self.qr(link) {
                Image(uiImage: img)
                    .interpolation(.none).resizable().scaledToFit()
                    .frame(width: 200, height: 200)
                    .padding(8).background(Color.white).cornerRadius(12)
                Text("Утасны eID апп-аар QR кодыг уншуулна уу.")
                    .font(.footnote).foregroundStyle(.secondary)
            }

            if let vc = s.verificationCode {
                Text("Баталгаажуулах код").font(.caption).foregroundStyle(.secondary)
                Text(vc).font(.system(size: 30, weight: .bold, design: .monospaced))
                    .kerning(4).foregroundStyle(.blue)
            }
            Label("Баталгаажуулалтыг хүлээж байна…", systemImage: "shield.lefthalf.filled")
                .font(.footnote).foregroundStyle(.secondary)
            ProgressView()
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    private func notice(_ text: String, retry: Bool) -> some View {
        VStack(spacing: 12) {
            Text(text).foregroundStyle(.red).multilineTextAlignment(.center)
            if retry {
                Button("Дахин оролдох") {
                    reset()
                    if method == .qr { beginQR() }
                }
                .buttonStyle(.bordered)
            }
        }.padding()
    }

    // MARK: - Flow

    private func reset() {
        pollTask?.cancel(); pollTask = nil
        start = nil; phase = .idle
    }

    private func beginID() {
        let rd = nationalID.trimmingCharacters(in: .whitespaces)
        guard !rd.isEmpty else { return }
        phase = .starting
        Task { @MainActor in
            do {
                let s = try await APIClient.shared.eidStartID(nationalID: rd)
                start = s; phase = .waiting; poll(s.sessionId)
            } catch { phase = .error }
        }
    }

    private func beginQR() {
        phase = .starting
        Task { @MainActor in
            do {
                let s = try await APIClient.shared.eidStartQR()
                start = s; phase = .waiting; poll(s.sessionId)
            } catch { phase = .error }
        }
    }

    private func poll(_ sessionID: String) {
        pollTask?.cancel()
        pollTask = Task { @MainActor in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 2_500_000_000)
                if Task.isCancelled { return }
                let st = (try? await APIClient.shared.eidPoll(sessionID: sessionID)) ?? "RUNNING"
                switch st {
                case "COMPLETE":
                    await state.onAuthenticated()
                    dismiss()
                    return
                case "EXPIRED": phase = .expired; return
                case "REFUSED": phase = .refused; return
                default: continue // RUNNING
                }
            }
        }
    }

    // MARK: - QR

    static func qr(_ string: String) -> UIImage? {
        let ctx = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let out = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8)),
              let cg = ctx.createCGImage(out, from: out.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
