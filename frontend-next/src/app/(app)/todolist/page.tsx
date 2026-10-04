"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Box, Button, IconButton, List, ListItem, ListItemText, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useAuth } from "@/contexts/AuthContext";
import { loadTodos, saveTodos, type Todo } from "@/lib/todos";

const readTodos = (companyId: number, userId: number): Todo[] => {
  try {
    return loadTodos(window.localStorage, companyId, userId);
  } catch {
    return [];
  }
};

// Porta de frontend/src/pages/ToDoList.
export default function ToDoListPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <ToDoList key={`${user.companyId}:${user.id}`} companyId={user.companyId} userId={user.id} />;
}

function ToDoList({ companyId, userId }: { companyId: number; userId: number }) {
  const { t } = useTranslation();
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<Todo[]>(() => readTodos(companyId, userId));
  const [editIndex, setEditIndex] = useState(-1);

  const update = (next: Todo[]) => {
    setTasks(next);
    try {
      saveTodos(window.localStorage, companyId, userId, next);
    } catch {
      // armazenamento indisponível: a lista fica só nesta aba
    }
  };

  const handleAddTask = () => {
    if (!task.trim()) return;
    const now = new Date().toISOString();
    if (editIndex >= 0) {
      update(tasks.map((item, index) => (index === editIndex ? { ...item, text: task, updatedAt: now } : item)));
      setEditIndex(-1);
    } else {
      update([...tasks, { text: task, createdAt: now, updatedAt: now }]);
    }
    setTask("");
  };

  const handleDeleteTask = (index: number) => {
    update(tasks.filter((_, i) => i !== index));
    if (editIndex === index) {
      setEditIndex(-1);
      setTask("");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", m: "2rem" }}>
      <Box sx={{ display: "flex", width: "100%", mb: "1rem" }}>
        <TextField
          sx={{ flexGrow: 1, mr: "1rem" }}
          label={t("todolist.input")}
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddTask()}
          variant="outlined"
        />
        <Button variant="contained" color="primary" onClick={handleAddTask}>
          {editIndex >= 0 ? t("todolist.buttons.save") : t("todolist.buttons.add")}
        </Button>
      </Box>
      <Box sx={{ width: "100%", height: "100%", mt: "1rem", backgroundColor: "#f5f5f5", borderRadius: "5px" }}>
        <List>
          {tasks.map((item, index) => (
            <ListItem
              key={`${item.createdAt}-${index}`}
              sx={{ mb: "5px", color: "rgba(0, 0, 0, 0.87)" }}
              secondaryAction={
                <>
                  <IconButton
                    aria-label="edit task"
                    onClick={() => {
                      setTask(item.text);
                      setEditIndex(index);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton aria-label="delete task" onClick={() => handleDeleteTask(index)}>
                    <DeleteIcon />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={item.text}
                secondary={format(new Date(item.updatedAt), "dd/MM/yyyy HH:mm:ss")}
                slotProps={{ secondary: { sx: { color: "rgba(0, 0, 0, 0.54)" } } }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}
