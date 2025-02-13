let originalData = [];

document.getElementById("fileInput").addEventListener("change", handleFileSelect, false);
document.getElementById("filterButton").addEventListener("click", filterData, false);
document.getElementById("resetButton").addEventListener("click", resetData, false);

function handleFileSelect(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    let jsonRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }).filter((row) => row.some((cell) => cell !== ""));

    if (jsonRaw.length < 3) {
      return;
    }

    const baseHeaders = jsonRaw[1];
    const subHeaders = jsonRaw[2]; 
    let finalHeaders = [];
    let currentParent = "";

    baseHeaders.forEach((col, index) => {
      if (col.trim() !== "") {
        currentParent = col.trim();
      }

      const mergedHeader = subHeaders[index]? `${currentParent} - ${subHeaders[index]}`.trim(): currentParent; finalHeaders.push(mergedHeader);});
      const dataRows = jsonRaw.slice(3).filter((row) => Object.values(row).some((cell) => cell !== ""));
      const jsonData = dataRows.map((row) => {
        let obj = {};
      finalHeaders.forEach((header, i) => {
        obj[header] = row[i] || "";
      });
      return obj;
    });
    originalData = jsonData;
    displayData(originalData);
  };
  reader.readAsArrayBuffer(file);
}

function updateResultsInfo(filteredData) {
  const resultInfo = document.getElementById("resultInfo");

  if (!filteredData || filteredData.length === 0) {
    resultInfo.textContent = `Found 0 records based on filters, out of ${originalData.length} total records.`;
  } 
  else {
    resultInfo.textContent = `Found ${filteredData.length} records based on filters, out of ${originalData.length} total records.`;
  }
}

function filterData() {
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  
  if (!originalData || originalData.length === 0) {
    table.innerHTML = `<tr><td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>No Excel file uploaded. Please upload a file before filtering.</td></tr>`;
    return;
  }

  const startDateInput = document.getElementById("startDate").value;
  const endDateInput = document.getElementById("endDate").value;
  const vesselColumnIndex = document.getElementById("vesselColumn").value;
  const statusFilter = document.getElementById("statusColumn").value;
  const startDate = startDateInput ? new Date(startDateInput) : null;
  const endDate = endDateInput ? new Date(endDateInput) : null;
  
  let filteredData = originalData;

  if (startDate && endDate) {
    filteredData = filteredData.filter((row) => {
      let dateValue = row["1st Employ"] ? convertExcelDate(row["1st Employ"]) : null;
      return !dateValue || (dateValue >= startDate && dateValue <= endDate);
    });
  }

  if (statusFilter !== "null") {
    filteredData = filteredData.filter((row) => {
      let cellValue = (row["Employment Status"] || "").trim().toUpperCase();
      return cellValue === statusFilter.toUpperCase();
    });
  }

  if (vesselColumnIndex !== "null") {
    const columnKeys = Object.keys(originalData[0]);
    const vesselColumn = columnKeys[parseInt(vesselColumnIndex)];
    filteredData = filteredData.filter(row => parseFloat(row[vesselColumn]) > 0);
    
    filteredData.sort((a, b) => {
      const valA = parseFloat(a[vesselColumn]) || 0;
      const valB = parseFloat(b[vesselColumn]) || 0;
      return valB - valA;
    });

    displayDataWithColor(filteredData, vesselColumn);
  } else {
    displayData(filteredData);
  }
}

function resetData() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("vesselColumn").value = "null";
  document.getElementById("statusColumn").value = "null";

  if (!originalData || originalData.length === 0) {
    document.getElementById("dataTable").innerHTML = `<tr><td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>No Excel file uploaded. Please upload a file before filtering.</td></tr>`;
    return;
  }
  displayData(originalData);
}

function convertExcelDate(value) {
  if (!isNaN(value)) {
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    return new Date(utcValue * 1000);
  }

  const date = new Date(value);
  return isNaN(date) ? null : date;
}

function formatDate(value) {
  if (!value) return "";
  let date = new Date(value);

  if (isNaN(date)) {
    date = convertExcelDate(value);
  }
  if (date && !isNaN(date)) {
    let day = date.getDate().toString().padStart(2, '0');
    let month = date.toLocaleString('en-US', { month: 'short' });
    let year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return value;
}

function displayData(data) {
  updateResultsInfo(data);
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  
  if (!data || data.length === 0) {
    table.innerHTML = `<tr>
      <td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>
        No records found.
      </td></tr>`;
    return;
  }

  const headerRow = document.createElement("tr");
  Object.keys(data[0]).forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  data.forEach((row) => {
    const tr = document.createElement("tr");
    Object.keys(row).forEach((key) => {
      const td = document.createElement("td");

      if (key.toLowerCase().includes("date") || key.toLowerCase().includes("employ") || key.toLowerCase().includes("birthday")) {
        td.textContent = formatDate(row[key]);
      } 
      else {
        td.textContent = row[key];
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

function displayDataWithColor(data, vesselColumn) {
  updateResultsInfo(data);
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  
  if (!data || data.length === 0) {
    table.innerHTML = `<tr><td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>No records found.</td></tr>`;
    return;
  }

  const maxValue = Math.max(...data.map((row) => parseFloat(row[vesselColumn]) || 0));
  const headerRow = document.createElement("tr");
  
  Object.keys(data[0]).forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  
  table.appendChild(headerRow);
  
  data.forEach((row) => {
    const tr = document.createElement("tr");
    
    Object.keys(row).forEach((key) => {
      const td = document.createElement("td");
      
      if (key.toLowerCase().includes("date") || key.toLowerCase().includes("employ") || key.toLowerCase().includes("birthday")) {
        td.textContent = formatDate(row[key]);
      } 
      else {
        td.textContent = row[key];
      }
      if (key === vesselColumn) {
        const value = parseFloat(row[key]) || 0;
        const intensity = maxValue > 0 ? value / maxValue : 0;
        const hue = 240 - intensity * 240;
        const lightness = 40 + intensity * 40;
        td.style.backgroundColor = `hsl(${hue}, 100%, ${lightness}%)`;
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}