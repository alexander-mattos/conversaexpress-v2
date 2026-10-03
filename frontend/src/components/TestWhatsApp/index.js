// TestWhatsApp.js
import React, { useState } from 'react';
import { testWhatsAppNotification } from './testWhatsAppNotification';
import { Button, Typography, Paper, TextField, Grid, CircularProgress, Snackbar } from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';

const Alert = (props) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
};

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 600,
    margin: '0 auto',
    marginTop: theme.spacing(4),
  },
  form: {
    marginTop: theme.spacing(2),
  },
  buttonWrapper: {
    position: 'relative',
    marginTop: theme.spacing(2),
  },
  button: {
    marginTop: theme.spacing(2),
  },
  buttonProgress: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  result: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: 4,
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
  },
}));

const TestWhatsApp = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [testData, setTestData] = useState({
    name: "Empresa Teste",
    email: "teste@exemplo.com",
    phone: "(11) 99999-9999",
    planId: "1"
  });

  const handleInputChange = (e) => {
    setTestData({
      ...testData,
      [e.target.name]: e.target.value
    });
  };

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await testWhatsAppNotification(testData);
      setResult(response);
      
      setSnackbar({
        open: true,
        message: response.success 
          ? 'Mensagem de teste enviada com sucesso!' 
          : `Erro no envio: ${response.error}`,
        severity: response.success ? 'success' : 'error'
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
      
      setSnackbar({
        open: true,
        message: `Erro ao executar o teste: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Paper className={classes.root}>
      <Typography variant="h5" component="h1" gutterBottom>
        Teste de Envio de WhatsApp
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Use este formulário para testar o envio de mensagens para o WhatsApp usando a Evolution API.
      </Typography>
      
      <form className={classes.form} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Nome da Empresa"
              variant="outlined"
              fullWidth
              value={testData.name}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="email"
              label="Email"
              variant="outlined"
              fullWidth
              value={testData.email}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="phone"
              label="Telefone"
              variant="outlined"
              fullWidth
              value={testData.phone}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="planId"
              label="ID do Plano"
              variant="outlined"
              fullWidth
              value={testData.planId}
              onChange={handleInputChange}
            />
          </Grid>
        </Grid>
        
        <div className={classes.buttonWrapper}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            onClick={handleTest}
            className={classes.button}
          >
            Testar Envio de WhatsApp
          </Button>
          {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
        </div>
      </form>
      
      {result && (
        <div className={classes.result}>
          <Typography variant="subtitle1" gutterBottom>
            Resultado do teste:
          </Typography>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default TestWhatsApp;