import type { ReactNode } from "react";
import { Box, Container, Skeleton, TableCell, TableRow, Typography } from "@mui/material";

// Peças comuns das telas de cadastro (MainContainer, MainHeader, Title,
// MainHeaderButtonsWrapper e TableRowSkeleton do frontend atual).
export function MainContainer({ children }: { children: ReactNode }) {
  return (
    <Container sx={{ flex: 1, p: 2, height: "calc(100% - 48px)" }}>
      <Box sx={{ height: "100%", overflowY: "hidden", display: "flex", flexDirection: "column" }}>{children}</Box>
    </Container>
  );
}

export function MainHeader({ children }: { children: ReactNode }) {
  return <Box sx={{ display: "flex", alignItems: "center", p: "0px 6px 6px 6px" }}>{children}</Box>;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Typography variant="h5" color="primary" gutterBottom>
      {children}
    </Typography>
  );
}

export function MainHeaderButtonsWrapper({ children }: { children: ReactNode }) {
  // "&&" para vencer a margem zero que o próprio Button define.
  return <Box sx={{ flex: "none", ml: "auto", "&& > *": { m: 1 } }}>{children}</Box>;
}

export function TableRowSkeleton({ avatar, columns }: { avatar?: boolean; columns: number }) {
  return (
    <TableRow>
      {avatar && (
        <>
          <TableCell sx={{ pr: 0 }}>
            <Skeleton animation="wave" variant="circular" width={40} height={40} />
          </TableCell>
          <TableCell>
            <Skeleton animation="wave" height={30} width={80} />
          </TableCell>
        </>
      )}
      {Array.from({ length: columns }, (_, index) => (
        <TableCell align="center" key={index}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Skeleton animation="wave" height={30} width={80} />
          </Box>
        </TableCell>
      ))}
    </TableRow>
  );
}

// Paper principal das listas (rolagem com a barra da marca).
export const mainPaperSx = { flex: 1, p: 1, overflowY: "scroll" } as const;
