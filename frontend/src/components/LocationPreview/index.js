import React, { useEffect } from 'react';
import toastError from "../../errors/toastError";

import { Button, Divider, Typography} from "@material-ui/core";
import { i18n } from '../../translate/i18n';

// Os dados vêm do corpo da mensagem enviada pelo contato: só aceita http(s).
const safeHttpUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch (err) {
        return null;
    }
};

// A miniatura da localização chega como data:image/...;base64 (segura em <img>).
const safeImageSrc = (value) => {
    const trimmed = String(value || "").trim();
    if (/^data:image\//i.test(trimmed)) return trimmed;
    return safeHttpUrl(trimmed);
};

const LocationPreview = ({ image, link, description }) => {
    useEffect(() => {}, [image, link, description]);

    const safeLink = safeHttpUrl(link);
    const safeImage = safeImageSrc(image);

    const handleLocation = async() => {
        if (!safeLink) return;
        try {
            window.open(safeLink, "_blank", "noopener,noreferrer");
        } catch (err) {
            toastError(err);
        }
    }

    return (
		<>
			<div style={{
				minWidth: "250px",
			}}>
				<div>
					<div style={{ float: "left" }}>
						{safeImage && <img src={safeImage} alt="loc" onClick={handleLocation} style={{ width: "100px" }} />}
					</div>
					{ description && (
					<div style={{ display: "flex", flexWrap: "wrap" }}>
						<Typography style={{ marginTop: "12px", marginLeft: "15px", marginRight: "15px", float: "left" }} variant="subtitle1" color="primary" gutterBottom>
							<div style={{ whiteSpace: "pre-line" }}>{description.replace('\\n', '\n')}</div>
						</Typography>
					</div>
					)}
					<div style={{ display: "block", content: "", clear: "both" }}></div>
					<div>
						<Divider />
						<Button
							fullWidth
							color="primary"
							onClick={handleLocation}
							disabled={!safeLink}
						>
							{i18n.t("locationPreview.button")}
						</Button>
					</div>
				</div>
			</div>
		</>
	);

};

export default LocationPreview;