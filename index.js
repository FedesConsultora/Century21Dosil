import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import basicAuth from 'express-basic-auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Middleware to handle CORS
const corsOptions = {
  origin: ['https://c21dosil.com', 'https://c21dosil.netlify.app'], // Agrega todos los orígenes permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Handling OPTIONS requests
app.options('*', cors(corsOptions));

// Basic authentication middleware
const authUsers = { 'admin': 'password123' }; // Cambia esto por usuarios y contraseñas reales
app.use('/download-excel', basicAuth({
  users: authUsers,
  challenge: true,
  unauthorizedResponse: 'Unauthorized'
}));

// Path to the JSON file
const filePath = path.join(process.cwd(), 'uploads', 'formulario_datos.json');

// Endpoint to handle form data
app.post('/submit', async (req, res) => {
  const data = req.body;

  if (!data.firstName || !data.email) {
    return res.status(400).send('Todos los campos son obligatorios');
  }

  const newData = {
    ...data,
    date: new Date().toLocaleString()
  };

  try {
    let existingData = [];

    if (fs.existsSync(filePath)) {
      console.log('El archivo JSON existe. Leyendo archivo...');
      const rawData = fs.readFileSync(filePath);
      existingData = JSON.parse(rawData);
    } else {
      console.log('El archivo JSON no existe. Creando nuevo archivo...');
    }

    existingData.push(newData);

    console.log('Escribiendo cambios en el archivo JSON...');
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log('Datos guardados exitosamente');

    // Verificación adicional
    const verificationData = JSON.parse(fs.readFileSync(filePath));
    console.log(`Número de registros después de guardar: ${verificationData.length}`);
    verificationData.forEach((record, index) => {
      console.log(`Registro ${index + 1}: `, record);
    });

    res.status(200).send('Datos guardados exitosamente');
  } catch (error) {
    console.error('Error al guardar el archivo JSON:', error);
    res.status(500).send('Error al guardar los datos');
  }
});

// Endpoint to convert JSON to Excel
app.get('/download-excel', async (req, res) => {
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('No hay datos para descargar');
    }

    const rawData = fs.readFileSync(filePath);
    const jsonData = JSON.parse(rawData);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');

    worksheet.columns = [
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Date', key: 'date', width: 20 }
    ];

    jsonData.forEach(data => {
      worksheet.addRow(data);
    });

    const tempExcelPath = path.join(process.cwd(), 'uploads', 'formulario_datos.xlsx');
    await workbook.xlsx.writeFile(tempExcelPath);

    res.download(tempExcelPath, 'formulario_datos.xlsx', (err) => {
      if (err) {
        console.error('Error al descargar el archivo Excel:', err);
        res.status(500).send('Error al descargar el archivo Excel');
      } else {
        // Eliminar el archivo temporal después de la descarga
        fs.unlinkSync(tempExcelPath);
      }
    });
  } catch (error) {
    console.error('Error al convertir JSON a Excel:', error);
    res.status(500).send('Error al convertir JSON a Excel');
  }
});

// Manejar errores globales
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).send('Ocurrió un error en el servidor');
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rechazo no manejado en la promesa:', promise, 'razón:', reason);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
