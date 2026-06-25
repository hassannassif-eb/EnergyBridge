import { Box, Typography } from "@mui/material";
import ClientTable from "../../components/Tables/ClientTable"
export default function Clients() {
  return (
    <Box
      sx={{
        p: 4,
        bgcolor: "#0D1117",
        minHeight: "100vh",
      }}
    >
      <Typography
        variant="h4"
        color="white"
        textAlign="center"
        mb={4}
      >
        Clients List
      </Typography>

      <ClientTable />
    </Box>
  );
}