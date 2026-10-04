"use client";

import type { ReactNode } from "react";
import { Avatar, Card, CardHeader, Skeleton } from "@mui/material";

const headerSx = {
  display: "flex",
  flex: "none",
  borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
  flexWrap: { xs: "wrap", md: "nowrap" }
} as const;

// TicketHeader + TicketHeaderSkeleton do frontend atual.
export default function TicketHeader({ loading, children }: { loading: boolean; children: ReactNode }) {
  if (loading) {
    return (
      <Card square sx={{ ...headerSx, bgcolor: "#eee" }}>
        <CardHeader
          slotProps={{ title: { noWrap: true }, subheader: { noWrap: true } }}
          avatar={
            <Skeleton animation="wave" variant="circular">
              <Avatar alt="contact_image" />
            </Skeleton>
          }
          title={<Skeleton animation="wave" width={80} />}
          subheader={<Skeleton animation="wave" width={140} />}
        />
      </Card>
    );
  }
  return (
    <Card square sx={{ ...headerSx, bgcolor: "tabHeaderBackground" }}>
      {children}
    </Card>
  );
}
