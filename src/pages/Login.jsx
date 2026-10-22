import { useState, useRef } from 'react';
import { Logo } from '../components/Brand';
import { Icon } from '../components/Icon';
import { Banner, PrimaryCTA, SecondaryCTA } from '../components/primitives';
import LOGINS from '../data/logins.json';
import GROUPS from '../data/personaGroups.json';
import PERSONAS from '../data/personas.json';

/* ---------- login ---------- */
export function MineScene() {
  const bench = [
    [600, 610, 520, 150, '#4d4639'],
    [600, 632, 440, 122, '#463f35'],
    [600, 652, 360, 96, '#3e3830'],
    [600, 670, 282, 72, '#36312b'],
    [600, 686, 206, 50, '#2f2a26'],
    [600, 698, 132, 30, '#282421'],
  ];
  return (
    <svg className="lg-scene" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#061331" />
          <stop offset=".55" stopColor="#1d3f74" />
          <stop offset=".72" stopColor="#3f78b8" />
          <stop offset=".8" stopColor="#4a4c55" />
        </linearGradient>
        <radialGradient id="sun" cx=".72" cy=".62" r=".35">
          <stop offset="0" stopColor="#7fd8f5" stopOpacity=".35" />
          <stop offset="1" stopColor="#7fd8f5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a5246" />
          <stop offset="1" stopColor="#1c1a18" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#sky)" />
      <rect width="1200" height="900" fill="url(#sun)" />
      <path
        d="M0 560 L120 520 L230 545 L360 500 L470 530 L600 488 L720 520 L860 470 L980 515 L1100 490 L1200 510 V900 H0Z"
        fill="#203a63"
        opacity=".85"
      />
      <path
        d="M0 590 L160 560 L300 585 L450 555 L620 580 L780 548 L940 578 L1080 556 L1200 570 V900 H0Z"
        fill="#323b4d"
      />
      <path d="M0 600 Q600 570 1200 600 V900 H0Z" fill="url(#ground)" />
      {bench.map(([cx, cy, rx, ry, f], i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={f}
          stroke="#857a66"
          strokeOpacity={0.5 - i * 0.06}
          strokeWidth="2"
        />
      ))}
      <path
        d="M1010 640 Q900 560 760 556 Q640 552 560 520 Q470 540 400 612 Q470 660 600 668 Q700 664 740 690"
        fill="none"
        stroke="#9c927e"
        strokeWidth="5"
        strokeOpacity=".5"
        strokeLinecap="round"
      />
      <g transform="translate(700 538)" fill="#141b29">
        <rect x="0" y="-16" width="52" height="16" rx="2" />
        <path d="M4 -16 L14 -30 H50 L56 -16Z" />
        <rect x="44" y="-26" width="16" height="14" rx="2" fill="#00A3DA" />
        <circle cx="10" cy="2" r="7" />
        <circle cx="44" cy="2" r="7" />
      </g>
      <g fill="#6c6352">
        <path d="M860 700 L960 610 L1060 700Z" />
        <path d="M960 715 L1060 630 L1160 715Z" fill="#7a705d" />
        <path d="M1040 725 L1120 660 L1200 725Z" fill="#5f5747" />
      </g>
      <g stroke="#c9d3e3" strokeOpacity=".45" strokeWidth="3" fill="none">
        <path d="M780 760 L1000 612" />
        <path d="M790 772 L1010 624" />
      </g>
      <g>
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((cI) => (
            <rect
              key={r + '-' + cI}
              x={40 + cI * 96 - r * 12}
              y={780 - r * 36}
              width="92"
              height="34"
              rx="2"
              fill={['#1B3874', '#0e6f8f', '#3a4560', '#24508f'][(r + cI) % 4]}
              opacity=".9"
            />
          )),
        )}
      </g>
      {[
        [300, 640],
        [340, 628],
        [880, 598],
        [540, 690],
        [660, 676],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#7fd8f5" opacity=".9" />
      ))}
    </svg>
  );
}

export const MAIL_OF = (role) => Object.keys(LOGINS).find((m) => LOGINS[m] === role);

export function LogoUploader({ onLogo, hasLogo, toast }) {
  return (
    <span
      className="row"
      style={{
        gap: '6px',
      }}
    >
      <label className="lg-up" title="Change logo" aria-label="Change logo">
        <Icon n="upload" c="sm" />
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files[0];
            if (!f) return;
            if (!/^image\//.test(f.type) || f.size > 1.5e6) {
              toast && toast('Choose an image under 1.5 MB.', 'bad');
              return;
            }
            const r = new FileReader();
            r.onload = () => onLogo(r.result);
            r.readAsDataURL(f);
          }}
        />
      </label>
      {hasLogo ? (
        <button
          type="button"
          className="lg-up"
          title="Use MMCZ logo"
          aria-label="Use MMCZ logo"
          onClick={() => onLogo(null)}
        >
          <Icon n="refresh" c="sm" />
        </button>
      ) : null}
    </span>
  );
}

export function shrinkImage(file, maxW, q) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error('read'));
    r.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error('decode'));
      im.onload = () => {
        const k = Math.min(1, maxW / im.width);
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k);
        cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        let out = cv.toDataURL('image/jpeg', q);
        if (out.length > 2.4e6) out = cv.toDataURL('image/jpeg', 0.6);
        res(out);
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

export function BgUploader({ onBg, hasBg, toast }) {
  return (
    <span
      className="row"
      style={{
        gap: '6px',
      }}
    >
      <label className="lg-up" title="Upload background image" aria-label="Upload background image">
        <Icon n="camera" c="sm" />
        <input
          id="lg-bg"
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files[0];
            e.target.value = '';
            if (!f) return;
            if (!/^image\//.test(f.type) || f.size > 15e6) {
              toast && toast('Choose an image file under 15 MB.', 'bad');
              return;
            }
            shrinkImage(f, 1800, 0.82)
              .then((v) => {
                onBg(v);
                toast && toast('Login background updated.', 'ok');
              })
              .catch(() => toast && toast('That image could not be read. Try a JPG or PNG.', 'bad'));
          }}
        />
      </label>
      {hasBg ? (
        <button
          type="button"
          className="lg-up"
          title="Default background"
          aria-label="Default background"
          onClick={() => {
            onBg(null);
            toast && toast('Default background restored.', 'ok');
          }}
        >
          <Icon n="x" c="sm" />
        </button>
      ) : null}
    </span>
  );
}

export function Login({ db, onLogin, onLogo, onBg, toast }) {
  const [step, setStep] = useState('cred');
  const [grp, setGrp] = useState('producer');
  const [email, setEmail] = useState(MAIL_OF('producer'));
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sent, setSent] = useState(false);
  const refs_ = useRef([]);
  const G = GROUPS.find((g) => g.k === grp);
  const acct = LOGINS[email.trim().toLowerCase()];
  const role = acct === 'admin' ? 'admin' : acct && G.roles.includes(acct) ? acct : null;
  const changeGrp = (k) => {
    setGrp(k);
    setErr('');
    const cur = LOGINS[email.trim().toLowerCase()];
    const g = GROUPS.find((x) => x.k === k);
    if (!cur || !g.roles.includes(cur)) setEmail(MAIL_OF(g.roles[0]));
  };
  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErr('Enter your user ID or email.');
      return;
    }
    if (!pwd) {
      setErr('Enter your password.');
      return;
    }
    if (!acct) {
      setErr('We could not find an account with that user ID. Check the spelling or contact your MMCZ administrator.');
      return;
    }
    if (!role) {
      setErr(`This account is not authorised for the ${G.label} persona. Choose the persona assigned to you.`);
      return;
    }
    setErr('');
    setStep('otp');
    setTimeout(() => refs_.current[0] && refs_.current[0].focus(), 50);
  };
  const verify = (e) => {
    e && e.preventDefault();
    if (otp.join('').length < 6) {
      setErr('Enter the 6-digit code sent to your registered device.');
      return;
    }
    onLogin(role);
  };
  const vals = [
    ['End-to-end traceability', 'One consignment ID links every record from declaration to export.', 'route'],
    ['Faster regulatory workflows', 'CD1 and Bill of Entry move through RBZ and ZIMRA without email chains.', 'clock'],
    ['Revenue assurance', 'Verified quantity and assay drive every invoice and exception.', 'shield'],
  ];
  return (
    <div className="login">
      <section className="lg-hero">
        {db.loginBg ? <img className="lg-scene" src={db.loginBg} alt="" /> : <MineScene />}
        <div className="lg-ov" />
        <div className="lg-in">
          <div className="lg-logo">
            <Logo src={db.logo} size={52} plate={1} />
          </div>
          <div className="lg-tools" role="group" aria-label="Login page branding">
            <LogoUploader onLogo={onLogo} hasLogo={!!db.logo} toast={toast} />
            <BgUploader onBg={onBg} hasBg={!!db.loginBg} toast={toast} />
          </div>
          <div className="lg-copy">
            <h1>MMCZ Digital Consignment Control Tower</h1>
            <p>Trusted visibility from mineral declaration to export.</p>
          </div>
          <ul className="lg-vals">
            {vals.map(([t, d, ic]) => (
              <li key={t}>
                <span className="vi">
                  <Icon n={ic} />
                </span>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="lg-panel">
        {step === 'cred' ? (
          <form className="lg-card" onSubmit={submit} noValidate>
            <div>
              <h2>Sign in</h2>
              <p
                className="muted"
                style={{
                  margin: '6px 0 0',
                }}
              >
                Use your MMCZ, producer or partner account.
              </p>
            </div>
            <label className="fld">
              <span className="lbl">Persona</span>
              <select id="lg-persona" className="in" value={grp} onChange={(e) => changeGrp(e.target.value)}>
                {GROUPS.map((g) => (
                  <option key={g.k} value={g.k}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span className="lbl">User ID or email</span>
              <input
                id="lg-email"
                className="in"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErr('');
                }}
                placeholder="name@organisation.co.zw"
              />
              {role && G.roles.length > 1 ? (
                <span className="help">
                  {'Signs in as '}
                  {PERSONAS[role].sub}
                  {' · '}
                  {PERSONAS[role].user}
                </span>
              ) : null}
            </label>
            <label className="fld">
              <span className="lbl">Password</span>
              <input
                id="lg-pwd"
                className="in"
                type="password"
                autoComplete="current-password"
                value={pwd}
                onChange={(e) => {
                  setPwd(e.target.value);
                  setErr('');
                }}
              />
            </label>
            {err ? <Banner tone="bad" title="Sign-in failed" text={err} /> : null}
            <PrimaryCTA type="submit" lg={1} block={1}>
              Sign In
            </PrimaryCTA>
            <div className="lg-alt">
              <button
                type="button"
                className="crumb"
                onClick={() => {
                  setStep('forgot');
                  setErr('');
                  setSent(false);
                }}
              >
                Forgot password?
              </button>
              <span className="muted">Protected by multi-factor authentication</span>
            </div>
          </form>
        ) : step === 'otp' ? (
          <form className="lg-card" onSubmit={verify}>
            <div>
              <h2>Verify it’s you</h2>
              <p
                className="muted"
                style={{
                  margin: '6px 0 0',
                }}
              >
                {'Enter the 6-digit one-time code sent to the device registered for '}
                {email}.
              </p>
            </div>
            <div className="otp">
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={'otp' + i}
                  ref={(el) => (refs_.current[i] = el)}
                  inputMode="numeric"
                  maxLength="1"
                  value={d}
                  aria-label={'Digit ' + (i + 1)}
                  onPaste={(e) => {
                    const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                    if (!t) return;
                    e.preventDefault();
                    setOtp((o) => o.map((x, j) => t[j] || x));
                    setErr('');
                    const f = refs_.current[Math.min(t.length, 5)];
                    f && f.focus();
                  }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(-1);
                    setOtp((o) => {
                      const n = [...o];
                      n[i] = v;
                      return n;
                    });
                    setErr('');
                    if (v && refs_.current[i + 1]) refs_.current[i + 1].focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && refs_.current[i - 1]) refs_.current[i - 1].focus();
                  }}
                />
              ))}
            </div>
            {err ? <Banner tone="bad" title="Code required" text={err} /> : null}
            <PrimaryCTA type="submit" lg={1} block={1}>
              {'Verify & Continue'}
            </PrimaryCTA>
            <div className="lg-alt">
              <button
                type="button"
                className="crumb"
                onClick={() => {
                  setStep('cred');
                  setOtp(['', '', '', '', '', '']);
                }}
              >
                Use a different account
              </button>
              <button
                type="button"
                className="crumb"
                onClick={() => toast && toast('A new code has been sent to your registered device.', 'ok')}
              >
                Resend code
              </button>
            </div>
          </form>
        ) : (
          <form
            className="lg-card"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) {
                setErr('Enter your user ID or email.');
                return;
              }
              setErr('');
              setSent(true);
            }}
            noValidate
          >
            <div>
              <h2>Reset password</h2>
              <p
                className="muted"
                style={{
                  margin: '6px 0 0',
                }}
              >
                We will send a reset link to the email registered with your account.
              </p>
            </div>
            <label className="fld">
              <span className="lbl">User ID or email</span>
              <input
                id="lg-reset"
                className="in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                }}
              />
            </label>
            {err ? <Banner tone="bad" title="Email required" text={err} /> : null}
            {sent ? (
              <Banner
                tone="ok"
                title="Check your email"
                text={`If an account exists for ${email}, a reset link is on its way. The link expires in 30 minutes.`}
              />
            ) : (
              <PrimaryCTA type="submit" lg={1} block={1}>
                Send Reset Link
              </PrimaryCTA>
            )}
            <SecondaryCTA
              onClick={() => {
                setStep('cred');
                setErr('');
              }}
            >
              Back to sign in
            </SecondaryCTA>
          </form>
        )}
      </div>
    </div>
  );
}
