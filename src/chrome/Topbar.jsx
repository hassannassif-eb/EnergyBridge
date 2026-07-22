import { memo, useEffect, useRef, useState } from "react";
import html from "./topbar.html?raw";


const Topbar = memo(() => {

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");

  const logoutRef = useRef(null);



  useEffect(() => {


    // Read current session user
    const loadUser = () => {

      const user =
        sessionStorage.getItem("username") || "User";

      setUsername(user);


      const label =
        document.getElementById("user-label");


      if(label){

        label.textContent = user;

      }

    };



    // Wait for injected HTML
    const timer = setTimeout(()=>{


      loadUser();



      const userPill =
        document.getElementById("user-pill");



      if(!userPill)
        return;



    const logout = () => {

  setLoading(true);

  // Clear browser session completely
  sessionStorage.clear();

  // Clear possible local storage auth
  localStorage.removeItem("token");
  localStorage.removeItem("username");

  // Reset engine session
  if (typeof session !== "undefined") {
  session = {
  username: "",
  password: "",
  role: "",
  perms: {}
};
  }

  // Reset EB engine
  if (window.__EB) {
    window.__EB.booted = false;
  }

  // Remove auth object
  window.EB_AUTH = null;


  setTimeout(() => {

    document.dispatchEvent(
      new CustomEvent("eb:navigate", {
        detail: {
          page: "login",
          param: null
        }
      })
    );

    setLoading(false);

  }, 800);

};



      logoutRef.current = logout;


  userPill.addEventListener(
  "click",
  logout
);



    },50);




   return () => {
  clearTimeout(timer);

  const userPill =
    document.getElementById("user-pill");

  if(userPill){
    userPill.onclick = null;
  }
};


  },[]);





  return (

    <>

      <div
        style={{
          display:"contents"
        }}

        dangerouslySetInnerHTML={{
          __html:html
        }}

      />



      {/*
        Update username after html injection
      */}

      <style>{`

        .logout-overlay{

          position:fixed;

          inset:0;

          background:
          rgba(10,11,16,.85);

          backdrop-filter:
          blur(8px);

          display:flex;

          align-items:center;

          justify-content:center;

          z-index:99999;

        }


        .logout-box{

          width:280px;

          padding:30px;

          background:#151722;

          border:1px solid #2A2C3A;

          border-radius:16px;

          text-align:center;

          color:white;

        }


        .logout-spinner{

          width:42px;

          height:42px;

          margin:auto;

          border-radius:50%;

          border:3px solid #303342;

          border-top-color:#FF3B3B;

          animation:
          spin .8s linear infinite;

        }



        @keyframes spin{

          to{

            transform:rotate(360deg);

          }

        }


      `}</style>




      {loading && (

        <div className="logout-overlay">


          <div className="logout-box">


            <div className="logout-spinner"/>


            <h3>
              Signing out
            </h3>


            <p>
              Closing secure session...
            </p>


          </div>


        </div>

      )}



    </>

  );

},()=>true);



export default Topbar;