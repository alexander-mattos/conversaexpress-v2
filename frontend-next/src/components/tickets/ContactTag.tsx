import { Box } from "@mui/material";
import type { Tag } from "@/lib/tickets/types";

export default function ContactTag({ tag }: { tag: Tag }) {
  return (
    <Box
      sx={{
        p: "1px 5px",
        borderRadius: "3px",
        fontSize: "0.8em",
        fontWeight: "bold",
        color: "#FFF",
        mr: "5px",
        mt: "2px",
        whiteSpace: "nowrap",
        backgroundColor: tag.color
      }}
    >
      {tag.name.toUpperCase()}
    </Box>
  );
}
