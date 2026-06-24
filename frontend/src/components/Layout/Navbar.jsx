import React, { useState } from "react";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
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
const drawerWidth = 260;


const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon /> },
  { text: "Customers", icon: <PeopleIcon /> },
  { text: "Settings", icon: <SettingsIcon /> },

  { text: "Inventory", icon: <Inventory2Icon /> },
  { text: "Reports", icon: <AssessmentIcon /> },
  { text: "Employees", icon: <BadgeIcon /> },
  { text: "Roles & Permissions", icon: <SecurityIcon /> },
  { text: "Packages", icon: <LocalOfferIcon /> },
  { text: "Coverage Areas", icon: <MapIcon /> },
  { text: "Routers & OLT", icon: <RouterIcon /> },
  { text: "Tickets", icon: <ConfirmationNumberIcon /> },
];



function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

 const drawer = (
  <Box sx={{ width: drawerWidth, mt: "64px" }}>
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold">
        Energy Bridge ISP
      </Typography>
      <Typography variant="caption" color="gray">
        Admin Panel
      </Typography>
    </Box>

    <Divider />

    <List>
      {menuItems.map((item) => (
<ListItem
  button
  sx={{
    borderRadius: 2,
    mx: 1,
    "&:hover": {
      backgroundColor: "#1f2937",
    },
  }}
>          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItem>
      ))}
    </List>
  </Box>
);

  return (
    <Box sx={{ display: "flex" }}>
      {/* TOP BAR */}
      <AppBar
  position="fixed"
  sx={{
    zIndex: 1201,
    backgroundColor: "#111827",
    borderBottom: "1px solid #1f2937",
  }}
>
        <Toolbar>
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

      {/* SIDEBAR */}
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
           "& .MuiDrawer-paper": {
  width: drawerWidth,
  backgroundColor: "#111827",
  borderRight: "1px solid #1f2937",
},
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
    </Box>
  );
}

export default Navbar;