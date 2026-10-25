import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface GroupReportData {
  id: number;
  nombre_materia: string;
  codigo_grupo: string;
  aula: string;
  horario: string;
  profesor_nombre?: string;
  total_alumnos: number;
  total_sesiones: number;
  total_asistencias?: number;
  porcentaje_asistencia: number;
}

export interface StudentAttendanceData {
  id: number;
  matricula: string;
  nombre: string;
  carrera?: string;
  total_asistencias: number;
  total_sesiones: number;
  porcentaje_asistencia: number;
  cumple_minimo?: boolean;
}

export const exportReports = {
  // Export all groups summary to Excel (.xlsx)
  exportGeneralToExcel: (grupos: GroupReportData[], profesorNombre: string = 'Docente CheckU') => {
    const data = grupos.map((g, idx) => ({
      '#': idx + 1,
      'Código': g.codigo_grupo,
      'Asignatura': g.nombre_materia,
      'Aula': g.aula,
      'Horario': g.horario,
      'Inscritos': g.total_alumnos,
      'Sesiones': g.total_sesiones,
      'Asistencia Promedio (%)': `${g.porcentaje_asistencia}%`,
      'Estatus': g.porcentaje_asistencia >= 80 ? 'Excelente' : g.porcentaje_asistencia >= 70 ? 'Regular' : 'En Riesgo',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 4 },
      { wch: 12 },
      { wch: 35 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 10 },
      { wch: 22 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen General');
    XLSX.writeFile(workbook, `CheckU_Reporte_General_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  // Export single class detailed attendance to Excel (.xlsx)
  exportClassToExcel: (
    grupo: GroupReportData,
    alumnos: StudentAttendanceData[],
    profesorNombre: string = 'Docente CheckU'
  ) => {
    const data = alumnos.map((al, idx) => ({
      '#': idx + 1,
      'Matrícula': al.matricula,
      'Nombre Completo': al.nombre,
      'Carrera': al.carrera || 'No registrada',
      'Asistencias': al.total_asistencias,
      'Sesiones Totales': al.total_sesiones,
      'Porcentaje (%)': `${al.porcentaje_asistencia}%`,
      'Cumple 80%': al.porcentaje_asistencia >= 80 ? 'SÍ' : 'NO',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Column widths
    worksheet['!cols'] = [
      { wch: 4 },
      { wch: 14 },
      { wch: 35 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Asistencias');
    const safeCode = grupo.codigo_grupo.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `CheckU_Clase_${safeCode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  // Export all groups to styled PDF
  exportGeneralToPDF: (grupos: GroupReportData[], profesorNombre: string = 'Docente CheckU') => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Brand Bar
    doc.setFillColor(23, 43, 77); // #172B4D
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFillColor(99, 184, 159); // #63B89F
    doc.rect(0, 24, pageWidth, 2.5, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('CheckU • Sistema Universitario de Asistencia', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(168, 216, 200);
    doc.text('Reporte General de Clases y Desempeño de Asistencia', 14, 18);

    // Meta Info
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Profesor: ${profesorNombre}`, 14, 34);
    doc.text(`Fecha de emisión: ${dateStr}`, pageWidth - 14, 34, { align: 'right' });

    // Table Data
    const tableHeaders = [
      ['#', 'Código', 'Asignatura', 'Aula', 'Horario', 'Alumnos', 'Sesiones', 'Asistencia %', 'Estatus'],
    ];
    const tableData = grupos.map((g, idx) => [
      idx + 1,
      g.codigo_grupo,
      g.nombre_materia,
      g.aula,
      g.horario,
      g.total_alumnos,
      g.total_sesiones,
      `${g.porcentaje_asistencia}%`,
      g.porcentaje_asistencia >= 80 ? 'APROBADO' : g.porcentaje_asistencia >= 70 ? 'REGULAR' : 'EN RIESGO',
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: {
        fillColor: [23, 43, 77],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const val = String(data.cell.raw);
          if (val === 'APROBADO') {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'REGULAR') {
            data.cell.styles.textColor = [161, 98, 7];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount} • Generado automáticamente por CheckU`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    doc.save(`CheckU_Reporte_General_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  // Export single class to styled PDF
  exportClassToPDF: (
    grupo: GroupReportData,
    alumnos: StudentAttendanceData[],
    profesorNombre: string = 'Docente CheckU'
  ) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Brand Bar
    doc.setFillColor(23, 43, 77); // #172B4D
    doc.rect(0, 0, pageWidth, 26, 'F');

    doc.setFillColor(99, 184, 159); // #63B89F
    doc.rect(0, 26, pageWidth, 2.5, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('CheckU • Reporte Oficial de Asistencias por Clase', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(168, 216, 200);
    doc.text(`${grupo.nombre_materia} (${grupo.codigo_grupo})`, 14, 19);

    // Class details card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 34, pageWidth - 28, 24, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 34, pageWidth - 28, 24, 3, 3, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Docente: ${profesorNombre}`, 18, 41);
    doc.text(`Aula: ${grupo.aula}`, 18, 48);
    doc.text(`Horario: ${grupo.horario}`, 18, 54);

    doc.text(`Total Alumnos: ${alumnos.length}`, pageWidth / 2 + 10, 41);
    doc.text(`Sesiones Impartidas: ${grupo.total_sesiones}`, pageWidth / 2 + 10, 48);
    doc.text(`Asistencia Promedio: ${grupo.porcentaje_asistencia}%`, pageWidth / 2 + 10, 54);

    // Table Data
    const tableHeaders = [
      ['#', 'Matrícula', 'Nombre del Alumno', 'Carrera', 'Asistencias', 'Sesiones', '% Asist.', 'Estatus'],
    ];
    const tableData = alumnos.map((al, idx) => [
      idx + 1,
      al.matricula,
      al.nombre,
      al.carrera || 'N/A',
      al.total_asistencias,
      al.total_sesiones,
      `${al.porcentaje_asistencia}%`,
      al.porcentaje_asistencia >= 80 ? 'CUMPLE' : 'NO CUMPLE',
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 63,
      theme: 'grid',
      headStyles: {
        fillColor: [23, 43, 77],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const val = String(data.cell.raw);
          if (val === 'CUMPLE') {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount} • CheckU - Control Universitario de Asistencia`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    const safeCode = grupo.codigo_grupo.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`CheckU_Reporte_${safeCode}_${new Date().toISOString().slice(0, 10)}.pdf`);
  },
};

export default exportReports;
