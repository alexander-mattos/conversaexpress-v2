import { Fragment } from "react";
import { Divider, ListItem, ListItemAvatar, ListItemText, Skeleton } from "@mui/material";

const WIDTHS = [
  [60, 90],
  [70, 120],
  [60, 90]
];

export default function TicketsListSkeleton() {
  return (
    <>
      {WIDTHS.map(([primary, secondary], index) => (
        <Fragment key={index}>
          <ListItem dense>
            <ListItemAvatar>
              <Skeleton animation="wave" variant="circular" width={40} height={40} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton animation="wave" height={20} width={primary} />}
              secondary={<Skeleton animation="wave" height={20} width={secondary} />}
            />
          </ListItem>
          <Divider variant="inset" />
        </Fragment>
      ))}
    </>
  );
}
