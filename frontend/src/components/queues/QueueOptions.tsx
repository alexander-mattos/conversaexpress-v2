"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Box, Button, IconButton, Step, StepContent, StepLabel, Stepper, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import ConfirmationModal from "@/components/ConfirmationModal";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import {
  addChildAt,
  draft,
  fromApi,
  getAt,
  removeAt,
  updateAt,
  type Path,
  type QueueOptionNode
} from "@/lib/queues/optionTree";

type ApiOption = Parameters<typeof fromApi>[0];

interface TreeActions {
  queueId: number;
  tree: QueueOptionNode[];
  setTree: (updater: (tree: QueueOptionNode[]) => QueueOptionNode[]) => void;
  askDelete: (path: Path) => void;
}

const loadOptions = async (queueId: number, parentId: number | -1) => {
  const { data } = await api.get<ApiOption[]>("/queue-options", { params: { queueId, parentId } });
  return data.map(fromApi);
};

function OptionStepper({ nodes, path, actions }: { nodes: QueueOptionNode[]; path: Path; actions: TreeActions }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(-1);
  const { queueId, setTree } = actions;

  const open = async (index: number) => {
    setActive(index);
    const node = nodes[index];
    if (!node?.id || node.children !== null) return;
    try {
      const children = await loadOptions(queueId, node.id);
      setTree(tree => updateAt(tree, [...path, index], { children }));
    } catch (err) {
      toastError(err);
    }
  };

  const save = async (index: number) => {
    const node = nodes[index];
    if (!node.title.trim()) {
      toast.error(t("queueModal.options.titleRequired"));
      return;
    }
    const payload = { queueId, title: node.title, message: node.message, option: node.option, parentId: node.parentId };
    try {
      if (node.id) {
        await api.put(`/queue-options/${node.id}`, payload);
        setTree(tree => updateAt(tree, [...path, index], { editing: false }));
      } else {
        const { data } = await api.post<{ id: number }>("/queue-options", payload);
        setTree(tree => updateAt(tree, [...path, index], { id: data.id, editing: false, children: [] }));
      }
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Stepper nonLinear activeStep={active} orientation="vertical" sx={{ mb: 0, pb: 0 }}>
      {nodes.map((node, index) => {
        const nodePath = [...path, index];
        const change = (patch: Partial<QueueOptionNode>) => setTree(tree => updateAt(tree, nodePath, patch));
        return (
          // Em edição, o texto da opção fica sempre visível (antes só ao abrir o passo).
          <Step key={node.key} data-testid="queue-option" expanded={node.editing || undefined}>
            <StepLabel sx={{ cursor: "pointer" }} onClick={() => open(index)}>
              {node.editing ? (
                <Box component="span" onClick={e => e.stopPropagation()}>
                  <TextField
                    value={node.title}
                    onChange={e => change({ title: e.target.value })}
                    size="small"
                    variant="standard"
                    sx={{ my: 1 }}
                    placeholder={t("queueModal.options.titlePlaceholder")}
                    slotProps={{ htmlInput: { "aria-label": t("queueModal.options.titlePlaceholder") } }}
                  />
                  <IconButton color="primary" size="small" sx={{ mr: 1 }} aria-label="save option" onClick={() => save(index)}>
                    <SaveIcon />
                  </IconButton>
                  <IconButton
                    color="secondary"
                    size="small"
                    sx={{ mr: 1 }}
                    aria-label="delete option"
                    onClick={() => actions.askDelete(nodePath)}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              ) : (
                <Typography component="span">
                  {node.title !== "" ? node.title : t("queueModal.options.untitled")}
                  <IconButton
                    size="small"
                    sx={{ mr: 1 }}
                    aria-label="edit option"
                    onClick={e => {
                      e.stopPropagation();
                      change({ editing: true });
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Typography>
              )}
            </StepLabel>
            <StepContent>
              {node.editing ? (
                <TextField
                  fullWidth
                  multiline
                  value={node.message}
                  onChange={e => change({ message: e.target.value })}
                  size="small"
                  variant="standard"
                  sx={{ my: 1 }}
                  placeholder={t("queueModal.options.messagePlaceholder")}
                  slotProps={{ htmlInput: { "aria-label": t("queueModal.options.messagePlaceholder") } }}
                />
              ) : (
                <Typography onClick={() => change({ editing: true })} sx={{ whiteSpace: "pre-wrap" }}>
                  {node.message}
                </Typography>
              )}
              {node.id !== undefined && (
                <Button
                  color="primary"
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  sx={{ my: 2 }}
                  onClick={() => setTree(tree => addChildAt(tree, nodePath))}
                >
                  {t("queueModal.options.add")}
                </Button>
              )}
              {node.children && node.children.length > 0 && (
                <OptionStepper nodes={node.children} path={nodePath} actions={actions} />
              )}
            </StepContent>
          </Step>
        );
      })}
    </Stepper>
  );
}

// Porta de frontend/src/components/QueueOptions (opções do chatbot da fila).
// Só aparece com a fila já salva: antes, as opções iam para o banco sem fila.
export default function QueueOptions({ queueId }: { queueId?: number | null }) {
  const { t } = useTranslation();
  const [tree, setTreeState] = useState<QueueOptionNode[]>([]);
  const [deleting, setDeleting] = useState<Path | null>(null);
  const [loadedFor, setLoadedFor] = useState<number | null | undefined>(undefined);
  if (loadedFor !== queueId) {
    setLoadedFor(queueId);
    setTreeState([]);
  }

  useEffect(() => {
    if (!queueId) return undefined;
    let active = true;
    loadOptions(queueId, -1)
      .then(options => active && setTreeState(options))
      .catch(err => active && toastError(err));
    return () => {
      active = false;
    };
  }, [queueId]);

  if (!queueId) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        {t("queueModal.options.saveQueueFirst")}
      </Typography>
    );
  }

  const setTree = (updater: (current: QueueOptionNode[]) => QueueOptionNode[]) => setTreeState(updater);

  const handleDelete = async (path: Path) => {
    const node = getAt(tree, path);
    if (!node) return;
    try {
      if (node.id) await api.delete(`/queue-options/${node.id}`);
      const { tree: next, renumbered } = removeAt(tree, path);
      setTreeState(next);
      // Regrava só o número das opções salvas que mudaram de posição.
      for (const item of renumbered) {
        await api.put(`/queue-options/${item.id}`, { option: item.option });
      }
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  const actions: TreeActions = { queueId, tree, setTree, askDelete: setDeleting };

  return (
    <Box sx={{ width: "100%", maxHeight: { xs: "20vh", md: "none" } }}>
      <ConfirmationModal
        title={t("queueModal.options.deleteTitle")}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("queueModal.options.deleteMessage")}
      </ConfirmationModal>
      <br />
      <Typography component="div">
        {t("queueModal.options.title")}
        <Button
          color="primary"
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{ ml: "10px" }}
          onClick={() => setTreeState(current => [...current, draft(current, null)])}
        >
          {t("queueModal.options.add")}
        </Button>
      </Typography>
      {tree.length > 0 && <OptionStepper nodes={tree} path={[]} actions={actions} />}
    </Box>
  );
}
