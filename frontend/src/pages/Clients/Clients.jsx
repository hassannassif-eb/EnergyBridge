import { Box, Typography } from "@mui/material";
import ClientTable from "../../components/Tables/ClientTable";

 function Clients() {
  return (
    <Box
      sx={{
        p: 4,
        bgcolor: "background.default",
        minHeight: "100vh",
      }}
    >
      <Typography
      
        variant="h4"
        textAlign="center"
        mb={4}
        color="text.primary"
        fontWeight={600}
      >
        Clients List
      </Typography>

      <ClientTable  />
      
    </Box>
  );
}
export default Clients;