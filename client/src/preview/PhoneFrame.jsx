// A realistic phone bezel around the embedded app. Fixed at the app's real
// mobile viewport (390x844, iPhone-ish) so what you see matches the device.
export default function PhoneFrame({ children }) {
  return (
    <div className="pf">
      <div className="pf__frame">
        <div className="pf__notch" aria-hidden="true" />
        <div className="pf__viewport">{children}</div>
      </div>
      <div className="pf__label">390 × 844</div>
    </div>
  );
}
