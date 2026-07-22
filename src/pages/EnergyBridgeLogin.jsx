import React, { useState, useCallback } from "react";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Energy Bridge — login screen
 * Topology map background with animated fiber-signal streaks
 * behind a glass login card. No external CSS needed — styles
 * are scoped via a single <style> block + inline style objects.
 */

const NODES = [
  { id: "n1", x: 30, y: 40 },
  { id: "n2", x: 160, y: 100 },
  { id: "n3", x: 100, y: 220 },
  { id: "n4", x: 330, y: 60 },
  { id: "n5", x: 470, y: 120 },
  { id: "n6", x: 580, y: 70 },
  { id: "n7", x: 560, y: 250 },
  { id: "n8", x: 230, y: 330 },
  { id: "n9", x: 410, y: 390 },
];

const STATIC_LINKS = [
  ["n1", "n2"],
  ["n3", "n8"],
  ["n5", "n6"],
  ["n8", "n9"],
  ["n4", "n8"],
  ["n1", "n4"],
  ["n5", "n7"],
];

// Links that carry an animated signal pulse (gradient streak)
const PULSE_LINKS = [
  { from: "n2", to: "n3", curve: "C 220 150, 60 190, 100 220", color: "#FF3B3B" },
  { from: "n4", to: "n5", curve: "C 400 90, 430 100, 470 120", color: "#FF3B3B" },
  { from: "n7", to: "n9", curve: "C 480 300, 460 360, 410 390", color: "#FF6A4D" },
];

function getNode(id) {
  return NODES.find((n) => n.id === id);
}

/**
 * Small Energy Bridge mark — two pylons joined by a span, with a
 * signal notch at the center. Swap this for an <img> tag if you
 * have an official logo asset (see comment below).
 */
function EnergyBridgeMark({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 17 V9" stroke="#FF3B3B" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21 17 V9" stroke="#FF3B3B" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M3 12 C 8 6, 16 6, 21 12"
        stroke="#EDEDF2"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="9.4" r="1.4" fill="#FF3B3B" />
    </svg>
  );
}

/* To use a real logo file instead of the drawn mark above, replace
   <EnergyBridgeMark /> in the JSX below with:
   <img src="/logo-energybridge.svg" alt="Energy Bridge" width={22} height={22} />
*/

export default function EnergyBridgeLogin({ onSubmit }) {
  const navigate=useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

const handleSubmit = useCallback(
  async (e) => {

    e.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setIsLoading(true);

    try {

      const response = await fetch(
        "http://10.249.2.9/api/ip-manager/auth/login",
        {
          method: "POST",
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data?.message || "Invalid username or password"
        );

      }


      const userSession = {

        username,

        role:
          data.role || "editor",

        perms:
          data.perms || {},

      };


      sessionStorage.setItem(
        "user",
        JSON.stringify(userSession)
      );


      sessionStorage.setItem(
        "username",
        username
      );


    sessionStorage.setItem(
    "authToken",
    data.token || "authenticated"
);


      // Clear previous page state
      sessionStorage.removeItem(
        "EB_CURRENT_PAGE"
      );


      // Prevent engine redirect after login
      sessionStorage.setItem(
        "justLoggedIn",
        "true"
      );


      window.EB_AUTH = userSession;


      if (onSubmit) {

        onSubmit(data);

      }


      setIsLoading(false);


      // React navigation only - no refresh
   sessionStorage.setItem(
  "justLoggedIn",
  "true"
);


navigate("/navbar", {
  replace:true
});


    } catch (err) {


      setIsLoading(false);


      setToast(
        "Check your username or password."
      );


      setTimeout(() => {

        setToast("");

      }, 3000);


    }

  },
  [
    username,
    password,
    onSubmit,
    navigate
  ]
);

return (
  <div style={styles.page}>

    {toast && (
      <div className="eb-toast">
        {toast}
      </div>
    )}


    {isLoading && (
      <div className="login-loader-overlay">

        <div className="login-loader">

          <div className="loader-ring"></div>

          <span>
            Signing in...
          </span>

        </div>

      </div>
    )}


    <style>{css}</style>


    <div style={styles.frame}>

      <svg
        style={styles.svg}
        viewBox="0 0 640 440"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >

        <defs>

          <linearGradient id="ebPulseA" x1="0" y1="0" x2="1" y2="0">

            <stop offset="0%" stopColor="#FF3B3B" stopOpacity="0" />

            <stop offset="50%" stopColor="#FF3B3B" stopOpacity="1" />

            <stop offset="100%" stopColor="#FF3B3B" stopOpacity="0" />

          </linearGradient>


          <linearGradient id="ebPulseB" x1="0" y1="0" x2="1" y2="1">

            <stop offset="0%" stopColor="#FF6A4D" stopOpacity="0" />

            <stop offset="50%" stopColor="#FF6A4D" stopOpacity="0.9" />

            <stop offset="100%" stopColor="#FF6A4D" stopOpacity="0" />

          </linearGradient>

        </defs>



        <g stroke="#1C2230" strokeWidth="1">

          {STATIC_LINKS.map(([a, b], i) => {

            const na = getNode(a);
            const nb = getNode(b);

            return (

              <line

                key={i}

                x1={na.x}
                y1={na.y}

                x2={nb.x}
                y2={nb.y}

              />

            );

          })}

        </g>



        {PULSE_LINKS.map((link, i) => (

          <path

            key={i}

            className="eb-pulse-path"

            d={
              `M ${getNode(link.from).x}
              ${getNode(link.from).y}
              ${link.curve}`
            }

            stroke={
              link.color === "#FF3B3B"
              ? "url(#ebPulseA)"
              : "url(#ebPulseB)"
            }

            strokeWidth="1.5"

            fill="none"

            style={{
              animationDelay:`${i * 0.9}s`
            }}

          />

        ))}



        <g fill="#5C6B80">

          {NODES.map((n)=>(

            <circle

              key={n.id}

              cx={n.x}

              cy={n.y}

              r={
                n.id === "n2" || n.id === "n5"
                ? 3
                : 2.5
              }

            />

          ))}

        </g>


      </svg>




      <div style={styles.center}>


        <form
          style={styles.card}
          onSubmit={handleSubmit}
          noValidate
        >


          <div style={styles.brandRow}>

            <EnergyBridgeMark />

            <span style={styles.brandName}>
              Energy Bridge
            </span>

          </div>




          <label
            style={styles.label}
            htmlFor="eb-username"
          >
            Username
          </label>


          <div style={styles.field}>

            <User
              size={16}
              color="#4E5060"
            />


            <input

              id="eb-username"

              type="text"

              autoComplete="username"

              value={username}

              onChange={(e)=>
                setUsername(e.target.value)
              }

              placeholder="name@energybridge.net"

              style={styles.input}

              disabled={isLoading}

            />

          </div>




          <label
            style={{
              ...styles.label,
              marginTop:18
            }}

            htmlFor="eb-password"
          >

            Password

          </label>




          <div style={styles.field}>


            <Lock
              size={16}
              color="#4E5060"
            />



            <input

              id="eb-password"

              type={
                showPassword
                ? "text"
                : "password"
              }

              autoComplete="current-password"

              value={password}

              onChange={(e)=>
                setPassword(e.target.value)
              }

              placeholder="••••••••••"

              style={styles.input}

              disabled={isLoading}

            />



            <button

              type="button"

              disabled={isLoading}

              onClick={() =>
                setShowPassword((s)=>!s)
              }

              style={styles.iconButton}

            >

              {
                showPassword

                ?

                <EyeOff
                  size={16}
                  color="#4E5060"
                />

                :

                <Eye
                  size={16}
                  color="#4E5060"
                />

              }

            </button>


          </div>





          {error && (

            <p style={styles.error}>
              {error}
            </p>

          )}






          <button

            type="submit"

            disabled={isLoading}

            style={styles.submit}

          >

            {

              isLoading

              ?

              <>

                <Loader2
                  size={16}
                  className="eb-spin"
                />

                Signing in

              </>

              :

              "Sign in"

            }


          </button>



        </form>


      </div>


    </div>


  </div>
);
}

const css = `
 .eb-pulse-path {
  stroke-dasharray: 140 400;
  stroke-dashoffset: 400;
  animation: eb-flow 3.2s linear infinite;
}

@keyframes eb-flow {
  to {
    stroke-dashoffset: -140;
  }
}


.eb-spin {
  animation: eb-spin .8s linear infinite;
}

@keyframes eb-spin {
  to {
    transform: rotate(360deg);
  }
}


/* Professional dark inputs */
#eb-username,
#eb-password {
  color:#EDEDF2 !important;
  background:transparent !important;
}


#eb-username::placeholder,
#eb-password::placeholder {
  color:#606575;
}


/* Remove Chrome autofill white background */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {

  -webkit-text-fill-color:#EDEDF2 !important;

  transition:
    background-color 9999s ease-in-out 0s;

  box-shadow:
    0 0 0px 1000px #101118 inset !important;
}



/* field hover */
.login-field:hover {
  border-color:#FF3B3B;
}



/* focus animation */
input:focus {
  outline:none;
}
`;

const styles = {
  page: {
    minHeight: "100vh",
  
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0A0B10",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: 24,
    boxSizing: "border-box",
  },
  frame: {
    position: "relative",
    width: "100%",
    maxWidth: 900,
    minHeight: 520,
    borderRadius: 12,
    overflow: "hidden",
    background: "#0A0B10",
  },
  svg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  center: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 520,
  },
card: {
  width: 500,
 
  background:"rgba(16,17,24,0.88)",
  backdropFilter:"blur(18px)",
  WebkitBackdropFilter:"blur(18px)",
  border:"1px solid rgba(255,255,255,0.08)",
  borderRadius:16,
  padding:"38px 36px",
  boxSizing:"border-box",
  boxShadow:
    "0 25px 70px rgba(0,0,0,.55)",
},
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 28,
  },
  brandName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 16,
    fontWeight: 500,
    color: "#EDEDF2",
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 11,
    color: "#7A7C8A",
    display: "block",
    marginBottom: 6,
  },
 field: {
  display: "flex",
  alignItems: "center",
  gap: 10,
  height: 42,
  padding: "0 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid #2A2C3A",
  borderRadius: 8,
  transition: "all .25s ease",
  boxSizing: "border-box",
},

input: {
  flex: 1,
  background: "transparent",
  color: "#EDEDF2",
  border: "none",
  outline: "none",
  fontSize: 14,
  height: "100%",
  fontFamily: "Inter, sans-serif",
},
  iconButton: {
    background: "transparent",
    border: "none",
    padding: 4,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  error: {
    fontSize: 12,
    color: "#F27C7C",
    marginTop: 14,
    marginBottom: 0,
  },
  submit: {
    marginTop: 26,
    width: "100%",
    height: 38,
    borderRadius: 19,
    border: "none",
    background: "linear-gradient(90deg,#7B5CFA,#3FA9F5)",
    color: "#0A0B14",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
};
