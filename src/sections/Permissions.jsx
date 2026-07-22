import React, { useEffect, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Divider,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import "../styles/Permissions.css";
import Navbar from "./Navbar";

function Permissions() {
    const API = import.meta.env.VITE_APP_URL;

  const [permissions, setPermissions] = useState({});


  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role_id: ""
  });
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success"
  });


  const [roleName, setRoleName] = useState("");
  const [roles, setRoles] = useState([]);
  const [user, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value
    });
  };
  const showToast = (message, severity = "success") => {
    setToast({
      open: true,
      message,
      severity
    });
  };

  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const handleAddRole = async () => {
    if (!roleName.trim()) {
      showToast(
        "Role created successfully",
        "success"
      );
      return;
    }
    try {
      const response = await fetch(
        "http://10.249.2.9/api/platform/roles",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Authorization":
              `Bearer ${window.authToken ||
              sessionStorage.getItem("authToken")
              }`
          },
          body: JSON.stringify({
            name: roleName
          })
        }
      );
      const data = await response.json();
      console.log(
        "Create Role:",
        data
      );
      if (response.ok) {
        showToast("Role Created Successfully");
        setRoleName("");
        setOpen(false);
        fetchRoles();
      }
      else {
        showToast(
          data.error || "Failed creating role",
          "error"
        );
      }
    }
    catch (error) {
      console.error(error);
      showToast(
        "Server error",
        "error"
      );
    }
  };

  const fetchRoles = async () => {
    try {
      const token =
        window.authToken ||
        sessionStorage.getItem("authToken");
      console.log("TOKEN:", token);
      if (!token) {
        console.error(
          "No authentication token"
        );
        return;
      }

      const response = await fetch(
        "http://10.249.2.9/api/platform/roles",
        {
          method: "GET",
          headers: {
            "Accept": "*/*",
            "Authorization":
              `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      console.log(
        "ROLES RESPONSE:",
        data
      );
      if (response.ok) {
        if (Array.isArray(data)) {
          setRoles(data);
        }
        else if (data.roles) {
          setRoles(data.roles);
        }
        else {
          console.error(
            "Invalid roles response",
            data
          );
        }
      }
      else {
        console.error(
          data.error ||
          "Failed loading roles"
        );
      }
    }
    catch (error) {
      console.error(
        "Fetch Roles Error:",
        error
      );
    }
  };
const fetchUsers = async () => {
    try {
        const token =
            window.authToken ||
            sessionStorage.getItem("authToken");

        if (!token) {
            console.error("No authentication token");
            return;
        }

        const response = await fetch(
            "http://10.249.2.9/api/ip-manager/users",
            {
                method: "GET",
                headers: {
                    Accept: "*/*",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        console.log("API Response:", data);

        if (!response.ok) {
            showToast(data.error || "Failed loading users", "error");
            return;
        }

      let usersList = [];


if (Array.isArray(data.data)) {

    usersList = data.data;

}
else if (Array.isArray(data)) {

    usersList = data;

}

        console.log("Users List:", usersList);

        setUsers(usersList);

    } catch (error) {
        console.error("Users error:", error);
    }
};
const fetchPermissions = async () => {

    try {

        const token =
            window.authToken ||
            sessionStorage.getItem("authToken");


        const response = await fetch(
            `http://10.249.2.9/api/platform/permissions`,
            {
                method:"GET",
                headers:{
                    Accept:"*/*",
                    Authorization:`Bearer ${token}`
                }
            }
        );


        const data = await response.json();


        console.log(
            "Permissions API:",
            data
        );


        const list = Array.isArray(data)
            ? data
            : data.permissions || [];


        const grouped = {};


        list.forEach(permission=>{

            const moduleName = permission.module;


            if(!grouped[moduleName]){
                grouped[moduleName] = [];
            }


            grouped[moduleName].push(permission);

        });


        setPermissions(grouped);


    }
    catch(error){

        console.error(
            "Permission loading error:",
            error
        );

    }

};
 useEffect(() => {

    fetchRoles();

    fetchUsers();

    fetchPermissions();

}, []);
  const handlePermissionChange = (permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(
        selectedPermissions.filter(
          item => item !== permission
        )
      );
    }
    else {
      setSelectedPermissions([
        ...selectedPermissions,
        permission
      ]);
    }
  };
  const savePermissions = () => {
    const payload = {
      role_id: selectedRole,
      id: selectedUser,
      permissions: selectedPermissions
    };
    console.log(
      "Permissions Payload:",
      payload
    );
    showToast(
      "Permissions saved",
      "success"
    );
  };
 return (

<Box className="permissions-page">

<Navbar/>


<Box
className="permissions-header"
display="flex"
justifyContent="space-between"
alignItems="center"
>

<Box sx={{marginTop:"-650px"}}>

<Typography variant="h2">
Permissions
</Typography>

<Typography color="text.secondary">
Configure access levels for roles and users
</Typography>

</Box>


<Button
className="energy-button"
variant="contained"
onClick={()=>setOpen(true)}
>
+ Add Role
</Button>


</Box>



<Box
className="filters-container"
display="flex"
gap={2}
mb={2}
flexWrap="wrap"
>


<TextField

select

fullWidth

className="permission-select"

label="Role"

name="role_id"

value={form.role_id}

onChange={handleChange}

>


<MenuItem value="">
<em>Select Role</em>
</MenuItem>


{
roles.map((role)=>(

<MenuItem

key={role.role_id}

value={role.role_id}

>

{role.name}

</MenuItem>

))

}


</TextField>





<FormControl

fullWidth

className="permission-select"

>


<InputLabel>
User
</InputLabel>


<Select

value={selectedUser}

label="User"

onChange={(e)=>
setSelectedUser(e.target.value)
}

>


<MenuItem value="">
<em>Select User</em>
</MenuItem>



{
user.map((user)=>(

<MenuItem

key={user.id}

value={user.id}

>

{user.username}

</MenuItem>

))

}


</Select>


</FormControl>


</Box>




<Paper className="permissions-panel">


<Typography variant="h5">

Permissions

</Typography>


<Divider sx={{my:1}} />



<Box className="permission-category-grid">


{
Object.entries(permissions).map(
([category,permissionList])=>(


<Box

key={category}

className="permission-category"

>


<Typography

variant="h6"

sx={{
mb:1,
fontWeight:"bold"
}}

>

{
category
.replace(/_/g," ")
.replace(/\b\w/g,c=>c.toUpperCase())
}

</Typography>


<Divider sx={{mb:1}} />



<Box

display="grid"

gridTemplateColumns={{
xs:"1fr",
md:"1fr"
}}

gap={0.5}

>


{
permissionList.map(permission=>(


<Box

key={permission.permission_id}

className="permission-item"

>


<FormControlLabel


control={

<Checkbox

size="small"

checked={
selectedPermissions.includes(
permission.permission_name
)
}


onChange={()=>{

handlePermissionChange(
permission.permission_name
)

}}


/>

}



label={

<Box>

<Typography

className="permission-label"

fontWeight={600}

>

{
permission.permission_name
}

</Typography>


<Typography

variant="caption"

color="text.secondary"

>

{
permission.description
}

</Typography>


</Box>

}


/>


</Box>


))

}


</Box>


</Box>


)

)

}


</Box>




<Button

className="energy-button save-button"

variant="contained"

sx={{
mt:2
}}

onClick={savePermissions}

>

Save Permissions

</Button>



</Paper>





<Dialog

open={open}

onClose={()=>setOpen(false)}

fullWidth

maxWidth="sm"

className="add-role-dialog"

>


<DialogTitle >
Add Role
</DialogTitle>



<DialogContent >


<TextField

fullWidth

margin="normal"

label="Role Name"

value={roleName}

onChange={(e)=>setRoleName(e.target.value)}

/>


</DialogContent>




<DialogActions >


<Button

onClick={()=>setOpen(false)}

>

Cancel

</Button>



<Button

variant="contained"

disabled={!roleName.trim()}

onClick={handleAddRole}

>

Create Role

</Button>


</DialogActions>



</Dialog>




<Snackbar

open={toast.open}

autoHideDuration={3000}

onClose={()=>setToast({
...toast,
open:false
})}


anchorOrigin={{

vertical:"top",

horizontal:"right"

}}

>


<Alert

severity={toast.severity}

variant="filled"

onClose={()=>setToast({
...toast,
open:false
})}

>

{toast.message}

</Alert>


</Snackbar>



</Box>

);

}


export default Permissions;