
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
} from "@mui/material";


import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import SecurityIcon from "@mui/icons-material/Security";
import DashboardIcon from "@mui/icons-material/Dashboard";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";


import "../styles/Topbar.css";
import "../styles/Navbar.css";


const menuItems = [

  {
    text:"Tech Dashboard",
    icon:<DashboardIcon/>,
    page:"dashboard"
  },

  {
    text:"Roles & Permissions",
    icon:<SecurityIcon/>,
    page:"permissions"
  }

];



export default function Navbar(){

const navigate = useNavigate();
const [mobileOpen,setMobileOpen] = useState(false);

const [anchorEl,setAnchorEl] = useState(null);

const [currentUser,setCurrentUser] = useState(null);

const [showLogoutModal,setShowLogoutModal] = useState(false);

const [isLoggingOut,setIsLoggingOut] = useState(false);




/*
====================================
LOAD USER + RESTORE ENGINE PAGE
====================================
*/

useEffect(() => {

    const savedUser =
        sessionStorage.getItem("user");


    if (savedUser) {

        setCurrentUser(
            JSON.parse(savedUser)
        );

    }


  



}, []);





const drawerToggle = ()=>{

    setMobileOpen(
        !mobileOpen
    );

};



const openMenu=(event)=>{

    setAnchorEl(
        event.currentTarget
    );

};



const closeMenu=()=>{

    setAnchorEl(null);

};





/*
====================================
LOGOUT
====================================
*/


const logout = ()=>{

    closeMenu();

    setShowLogoutModal(true);

};




const confirmLogout = ()=>{


    setShowLogoutModal(false);

    setIsLoggingOut(true);



    sessionStorage.removeItem(
        "authToken"
    );


    sessionStorage.removeItem(
        "user"
    );


    sessionStorage.removeItem(
        "permissions"
    );


    sessionStorage.removeItem(
        "EB_ACTIVE_PAGE"
    );



    setTimeout(()=>{


        window.location.href="/login";


    },1000);



};






/*
====================================
SIDEBAR
====================================
*/


const drawer = (


<Box className="sidebar-container">


<div className="brand-box">


<div className="brand-logo">

EB

</div>


</div>





<List className="menu-list">


{

menuItems.map((item,index)=>(


<ListItemButton


key={index}


className="menu-button"



onClick={() => {
  sessionStorage.setItem("EB_CURRENT_PAGE", item.page);

  window.location.href=(`/${item.page}`, { replace: false });
}}



>


<ListItemIcon className="menu-icon">

{item.icon}

</ListItemIcon>



<ListItemText

primary={item.text}

/>



</ListItemButton>


))


}



</List>





<div className="sidebar-footer">


<span>

© 2026 Energy Bridge

</span>


</div>



</Box>


);
return (

<Box className="layout">



<AppBar

position="fixed"

className="custom-navbar"

>


<Toolbar className="navbar-toolbar">



<IconButton

className="mobile-button"

onClick={drawerToggle}

>


<MenuIcon/>


</IconButton>





<div className="navbar-title">


<Typography>

Energy Bridge

</Typography>


<span>

Network Operations Center

</span>


</div>






<div className="user-area">



<IconButton

onClick={openMenu}

className="user-button"

>



<Avatar className="user-avatar">


{

currentUser?.username

?

currentUser.username
.charAt(0)
.toUpperCase()

:

"U"

}


</Avatar>





<div className="user-info">


<strong>


{

currentUser?.username

||

"User"

}


</strong>



</div>





<KeyboardArrowDownIcon/>



</IconButton>







<Menu


anchorEl={anchorEl}


open={Boolean(anchorEl)}


onClose={closeMenu}


className="profile-menu"



>



<MenuItem>


Profile


</MenuItem>



<MenuItem>


Settings


</MenuItem>





<Divider/>





<MenuItem


onClick={logout}


className="logout-item"


>



<LogoutIcon/>


&nbsp;

Logout



</MenuItem>




</Menu>




</div>





</Toolbar>


</AppBar>







{/* MOBILE SIDEBAR */}


<Drawer


variant="temporary"


open={mobileOpen}


onClose={drawerToggle}


className="mobile-sidebar"



>


{drawer}


</Drawer>







{/* DESKTOP SIDEBAR */}


<Drawer


variant="permanent"


className="desktop-sidebar"


open



>


{drawer}


</Drawer>








{/* LOGOUT CONFIRMATION */}


{

showLogoutModal && (


<div className="confirm-overlay">


<div className="confirm-modal">



<div className="confirm-icon">


⎋


</div>




<h2>


Sign Out


</h2>




<p>


Are you sure you want to sign out of

<br/>


<strong>

EB IP Management System

</strong>


?


</p>





<div className="confirm-actions">



<button


className="btn btn-secondary"


onClick={()=>setShowLogoutModal(false)}



>


Cancel


</button>






<button


className="btn btn-primary"


onClick={confirmLogout}



>


Yes, Sign Out


</button>




</div>




</div>


</div>


)


}







{/* LOGOUT LOADER */}



{

isLoggingOut && (


<div className="logout-loader">


<div className="internet-loader"></div>


<span>

Signing out...

</span>


</div>


)

}





</Box>


);


}