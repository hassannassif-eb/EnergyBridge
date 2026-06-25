import {
  Box,
  Paper,
  TextField,
  IconButton,
  InputAdornment,
} from "@mui/material";

import {
  DataGrid
} from "@mui/x-data-grid";

import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

const rows = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    business: "Microsoft",
  },
  {
    id: 2,
    firstName: "Ali",
    lastName: "Nassif",
    business: "Google",
  },
];

const columns = [
  {
    field: "id",
    headerName: "ID",
    width: 90,
  },
  {
    field: "firstName",
    headerName: "First Name",
    flex: 1,
  },
  {
    field: "lastName",
    headerName: "Last Name",
    flex: 1,
  },
  {
    field: "business",
    headerName: "Business",
    flex: 1,
  },
  {
    field: "actions",
    headerName: "Actions",
    width: 120,
    sortable: false,
    renderCell: () => (
      <>
        <IconButton color="primary">
          <EditOutlinedIcon />
        </IconButton>

        <IconButton color="error">
          <DeleteOutlineOutlinedIcon />
        </IconButton>
      </>
    ),
  },
];

export default function ClientTable() {
  return (
    <Box>
      <TextField
        fullWidth
        placeholder="search by name or email"
        sx={{
          mb: 3,
          "& .MuiOutlinedInput-root": {
            bgcolor: "#161B22",
            borderRadius: "12px",
            color: "white",
          },
          "& input::placeholder": {
            color: "#8b949e",
            opacity: 1,
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "#8b949e" }} />
            </InputAdornment>
          ),
        }}
      />

      <Paper
        sx={{
          bgcolor: "#161B22",
          borderRadius: 4,
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
          sx={{
            bgcolor: "#161B22",
            color: "white",
            border: 0,

            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "#161B22",
              color: "white",
            },

            "& .MuiDataGrid-cell": {
              borderColor: "#30363d",
            },

            "& .MuiDataGrid-columnSeparator": {
              color: "#30363d",
            },

            "& .MuiDataGrid-footerContainer": {
              background: "#161B22",
              color: "white",
            },

            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#1f2937",
            },
          }}
        />
      </Paper>
    </Box>
  );
}