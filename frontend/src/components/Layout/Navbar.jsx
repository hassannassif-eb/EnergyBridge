import React, { useState } from "react";
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
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BadgeIcon from "@mui/icons-material/Badge";
import SecurityIcon from "@mui/icons-material/Security";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import MapIcon from "@mui/icons-material/Map";
import RouterIcon from "@mui/icons-material/Router";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import { useNavigate } from "react-router-dom";

const drawerWidth = 260;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { text: "Clients", icon: <PeopleIcon />, path: "/clients" },
  { text: "Settings", icon: <SettingsIcon /> },
  { text: "Inventory", icon: <Inventory2Icon /> },
  { text: "Reports", icon: <AssessmentIcon /> },
  { text: "Employees", icon: <BadgeIcon /> },
  { text: "Roles & Permissions", icon: <SecurityIcon /> },
  { text: "Packages", icon: <LocalOfferIcon /> },
  { text: "Coverage Areas", icon: <MapIcon /> },
  // { text: "Routers & OLT", icon: <RouterIcon /> },
  { text: "Tickets", icon: <ConfirmationNumberIcon /> },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  
const navigate=useNavigate();
  const drawerContent = (
    <Box sx={{ width: drawerWidth,overflowX:"hidden" }}>
      
      {/* HEADER */}
      <Box sx={{ p: 2, mt: 7 }}>
        <Typography variant="h6" fontWeight="bold">
          Energy Bridge ISP
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Admin Panel
        </Typography>
      </Box>

      <Divider />

      {/* MENU */}
     <List
  sx={{
    p: 0,
    width: "100%",
    overflowX: "hidden",
  }}
>
  {menuItems.map((item, index) => (
    <React.Fragment key={index}>
      <ListItemButton
        onClick={() => navigate(item.path)}
       sx={{
  borderRadius: 2,
  px: 2,
  py: 1,
  width: "100%",
  boxSizing: "border-box",
}}
      >
        <ListItemIcon
  sx={{
    minWidth: 40,
  }}
>
  {item.icon}
</ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>

      <Divider />
    </React.Fragment>
  ))}
</List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>

      {/* TOP BAR */}
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar sx={{bgcolor: "background.paper"}}>

          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Dashboard
          </Typography>

          <IconButton onClick={handleMenuOpen}>
            <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
            <MenuItem onClick={handleMenuClose}>My Account</MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>

        </Toolbar>
      </AppBar>

      {/* MOBILE DRAWER */}
     <Drawer
  variant="permanent"
  sx={{
    display: { xs: "none", sm: "block" },
    flexShrink: 5,
    "& .MuiDrawer-paper": {
      width: drawerWidth,
      boxSizing: "border-box",
      overflowX: "hidden",
    },
  }}
>
        {drawerContent}
      </Drawer>

      {/* DESKTOP DRAWER */}
      <Drawer
        variant="permanent"
        sx={{
            
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            overflowX:"hidden",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

    </Box>
  );
}

export default Navbar;