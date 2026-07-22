import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { loadEngine } from "./engine/loadEngine.js";

import Topbar from "./chrome/Topbar.jsx";
import Sidebar from "./chrome/Sidebar.jsx";
import LegacyChrome from "./chrome/LegacyChrome.jsx";
import EnergyBridgeLogin from "./pages/EnergyBridgeLogin.jsx";
import Dashboard from "./sections/Dashboard.jsx";
import RealIpSubnet from "./sections/RealIpSubnet.jsx";
import FakeIpSubnet from "./sections/FakeIpSubnet.jsx";
import WanSolutions from "./sections/WanSolutions.jsx";
import VlanTracking from "./sections/VlanTracking.jsx";
import IpTunnels from "./sections/IpTunnels.jsx";
import Vpn from "./sections/Vpn.jsx";
import DspProviders from "./sections/DspProviders.jsx";
import ClientSearch from "./sections/ClientSearch.jsx";
import Credentials from "./sections/Credentials.jsx";
import Permissions from "./sections/Permissions.jsx";
import Navbar from './sections/Navbar.jsx';
import Clients from './sections/Clients.jsx';

function renderSection(route) {

  if (!route) return null;


  switch (route.page) {

    case "dashboard":
      return <Dashboard />;


    case "permissions":
      return <Permissions />;
      
    case "navbar":
      return <Navbar />;
case "clients":
  return <Clients />;

    case "subnet":
      return <RealIpSubnet subnet={route.param} />;


    case "internal":
      return <FakeIpSubnet subnet={route.param} />;


    case "wan":
      return <WanSolutions />;


    case "vlan":
      return <VlanTracking />;


    case "tunnels":
      return <IpTunnels />;


    case "vpn":
      return <Vpn />;


    case "dsp":
      return <DspProviders />;


    case "search":
      return <ClientSearch />;


    case "credentials":
      return <Credentials />;


    default:
      return <Dashboard />;
  }

}



export default function App() {


  const navigate = useNavigate();
  const location = useLocation();


  const [engineReady, setEngineReady] = useState(false);


const [route, setRoute] = useState(() => {

  const token = sessionStorage.getItem("authToken");
  const savedUser = sessionStorage.getItem("username");

  const path =
    window.location.pathname.replace("/", "");


  if(token && savedUser){

    return {
      page: path || "navbar",
      param:null,
      n:Date.now()
    };

  }


  return {
    page:"login",
    param:null,
    n:Date.now()
  };

});



useEffect(() => {

  const page =
    location.pathname.replace("/", "");


  if(page){

    setRoute({
      page,
      param:null,
      n:Date.now()
    });

  }

}, [location.pathname]);

  useEffect(() => {


  const onNavigate = (e) => {

    const page = e.detail.page;

    if (
        sessionStorage.getItem("justLoggedIn") === "true"
    ) {

        sessionStorage.removeItem("justLoggedIn");

        if (page === "dashboard") {

            console.log("Skipping initial dashboard redirect");

            return;
        }

    }

    setRoute({
        page,
        param: e.detail.param || null,
        n: Date.now()
    });

    navigate(`/${page}`);
};



    document.addEventListener(
      "eb:navigate",
      onNavigate
    );



    loadEngine()

      .then(() => {

        setEngineReady(true);

      })

      .catch(err => {

        console.error(
          err
        );

      });



    return () => {

      document.removeEventListener(
        "eb:navigate",
        onNavigate
      );

    };


  }, [navigate]);







useEffect(() => {

    const page =
        location.pathname.replace("/","");


    if(
        page &&
        page !== "login"
    ){

        setRoute({

            page,
            param:null,
            n:Date.now()

        });

    }


},[location.pathname]);






useEffect(() => {

    const token =
        sessionStorage.getItem("authToken");


    if(
        engineReady &&
        token &&
        window.__EB &&
        !window.__EB.booted
    ){

        console.log("Starting EB engine");

        window.__EB.boot();

    }

}, [engineReady]);






  return (

    <>


      <LegacyChrome />



      {
        engineReady &&
        route.page !== "login" &&

        (

          <>


            <Topbar />


            <div
              className="layout"
              id="app-layout"
            >


              <Sidebar />


              {
                renderSection(route)
              }


            </div>



          </>

        )

      }





      {
        route.page === "login" &&

        (

          <EnergyBridgeLogin />

        )

      }


    </>

  );

}