let originalData = [];

document
  .getElementById("fileInput")
  .addEventListener("change", handleFileSelect, false);
document
  .getElementById("filterButton")
  .addEventListener("click", filterData, false);
document
  .getElementById("resetButton")
  .addEventListener("click", resetData, false);

function handleFileSelect(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    originalData = json;
    displayData(originalData);
  };
  reader.readAsArrayBuffer(file);
}

function displayData(data) {
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  if (data.length === 0) {
    table.innerHTML =
      "<tr><td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>No records found, error.</td></tr>";
    return;
  }
  const headerRow = document.createElement("tr");
  data[0].forEach((cell) => {
    const th = document.createElement("th");
    th.textContent = cell;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  data.slice(1).forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
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

function handleFileSelect(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
    originalData = json;
    displayData(originalData);
  };
  reader.readAsArrayBuffer(file);
}

function filterData() {
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  if (!originalData || originalData.length === 0) {
    table.innerHTML =
      "<tr><td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>No Excel file uploaded. Please upload a file before filtering.</td></tr>";
    return;
  }
  const startDateInput = document.getElementById("startDate").value;
  const endDateInput = document.getElementById("endDate").value;
  const vesselColumnIndex = parseInt(
    document.getElementById("vesselColumn").value
  );
  const statusFilter = document.getElementById("statusColumn").value;
  const startDate = startDateInput ? new Date(startDateInput) : null;
  const endDate = endDateInput ? new Date(endDateInput) : null;
  const headers = originalData[0];
  const dataRows = originalData.slice(1);
  const dateColumnIndex = 7;
  const statusColumnIndex = 4;
  let filteredData = dataRows;
  if (startDate && endDate) {
    filteredData = filteredData.filter((row) => {
      const dateCell = convertExcelDate(row[dateColumnIndex]);
      return dateCell && dateCell >= startDate && dateCell <= endDate;
    });
  }
  if (statusFilter !== "null") {
    filteredData = filteredData.filter((row) => {
      const cellValue = (row[statusColumnIndex] || "").trim().toUpperCase();
      return cellValue === statusFilter.toUpperCase();
    });
  }
  if (!isNaN(vesselColumnIndex)) {
    filteredData.sort((a, b) => {
      const valA = parseFloat(a[vesselColumnIndex]) || 0;
      const valB = parseFloat(b[vesselColumnIndex]) || 0;
      return valB - valA;
    });
  }
  displayData([headers, ...filteredData]);
  colorColumn(vesselColumnIndex, filteredData);
}

function resetData() {
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("vesselColumn").value = "null";
  document.getElementById("statusColumn").value = "null";
  if (!originalData || originalData.length === 0) {
    table.innerHTML =
      "<tr><td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>No Excel file uploaded. Please upload a file before filtering.</td></tr>";
    return;
  } else {
    displayData(originalData);
  }
}

function colorColumn(columnIndex, dataRows) {
  const table = document.getElementById("dataTable");
  const rows = table.getElementsByTagName("tr");
  let maxVal = Math.max(
    ...dataRows.map((row) => parseFloat(row[columnIndex]) || 0)
  );
  for (let i = 1; i < rows.length; i++) {
    const cell = rows[i].cells[columnIndex];
    if (cell) {
      const value = parseFloat(cell.textContent) || 0;
      const intensity = value > 0 ? Math.round((value / maxVal) * 255) : 0;
      cell.style.backgroundColor = `rgb(${255 - intensity}, ${255}, ${
        255 - intensity
      })`;
    }
  }
}
