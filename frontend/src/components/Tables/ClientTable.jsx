import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  InputAdornment,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

const initialRows = [
  { id: 1, firstName: "John", lastName: "Doe", business: "Microsoft" },
  { id: 2, firstName: "Ali", lastName: "Nassif", business: "Google" },
];

 function ClientTable() {
  const [rows, setRows] = useState(initialRows);

  const columns = [
    { field: "id", headerName: "ID", width: 90, editable: false },
    { field: "firstName", headerName: "First Name", flex: 1, editable: true },
    { field: "lastName", headerName: "Last Name", flex: 1, editable: true },
    { field: "business", headerName: "Business", flex: 1, editable: true },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      
 renderCell: (params) => {
  const handleClick = (e) => {
    e.stopPropagation();
  };

  return (
    <Box sx={{ display: "flex", gap: 1 }} onClick={handleClick}>
      <IconButton
        color="primary"
        size="small"
        onClick={handleClick}

      >
        <EditOutlinedIcon fontSize="small"  />
      </IconButton>

      <IconButton
        color="error"
        size="small"
        onClick={handleClick}
      >
        <DeleteOutlineOutlinedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
    },
  ];

  return (
    <Box>
      
      {/* SEARCH */}
     <TextField
  fullWidth
  placeholder="Search clients, business, or email..."
  sx={{
    mb: 3,

    "& .MuiOutlinedInput-root": {
      bgcolor: "background.paper",
      borderRadius: 2,
      color: "text.primary",
      paddingLeft: 1,

      transition: "0.2s",

      "& fieldset": {
        borderColor: "divider",
      },

      "&:hover fieldset": {
        borderColor: "primary.main",
      },

      "&.Mui-focused fieldset": {
        borderColor: "primary.main",
        boxShadow: "0 0 0 2px rgba(79, 70, 229, 0.2)",
      },
    },

    "& input::placeholder": {
      color: "text.holder",
      opacity: 1,
    },
  }}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <SearchIcon sx={{ color: "text.secondary" }} />
      </InputAdornment>
    ),
  }}
/>

      {/* TABLE */}
      <Paper
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <DataGrid
        
          rows={rows}
          columns={columns}
          autoHeight
          pageSizeOptions={[5]}
          disableRowSelectionOnClick
          hideFooterSelectedRowCount

          // 🔥 EDIT HANDLER (fixed + clean)
          processRowUpdate={(newRow) => {
            const updated = rows.map((r) =>
              r.id === newRow.id ? newRow : r
            );
            setRows(updated);
            return newRow;
          }}
          

       sx={{
  bgcolor: "background.paper",
  color: "text.primary",
  border: 0,


 

  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "background.paper",
  },

  "& .MuiDataGrid-cell": {
    borderColor: "divider",
  },

  "& .MuiDataGrid-row:hover": {
    backgroundColor: "action.hover",
  },
}}
        />
      </Paper>
    </Box>
  );
}
export default ClientTable;