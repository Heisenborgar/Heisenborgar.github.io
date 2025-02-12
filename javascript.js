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
  if (!file) {
    //console.log("No file selected.");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    let jsonRaw = XLSX.utils
      .sheet_to_json(worksheet, { header: 1, raw: false, defval: "" })
      .filter((row) => row.some((cell) => cell !== ""));
    // console.log("Raw Data Before Processing:", jsonRaw);
    if (jsonRaw.length < 3) {
      // console.error("Not enough rows in the Excel file.");
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
      const mergedHeader = subHeaders[index]
        ? `${currentParent} - ${subHeaders[index]}`.trim()
        : currentParent;
      finalHeaders.push(mergedHeader);
    });
    // console.log("Corrected Headers:", finalHeaders);
    const dataRows = jsonRaw
      .slice(3)
      .filter((row) => Object.values(row).some((cell) => cell !== "")); // Skip empty rows
    // console.log("Parsed Data Before Assignment:", dataRows);
    const jsonData = dataRows.map((row) => {
      let obj = {};
      finalHeaders.forEach((header, i) => {
        obj[header] = row[i] || "";
      });
      return obj;
    });
    // console.log("Final JSON Data (Corrected Alignment):", jsonData);
    originalData = jsonData;
    displayData(originalData);
  };
  reader.readAsArrayBuffer(file);
}

function displayData(data) {
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
    Object.values(row).forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

function filterData() {
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  if (!originalData || originalData.length === 0) {
    table.innerHTML = `<tr>
      <td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>
        No Excel file uploaded. Please upload a file before filtering.
      </td></tr>`;
    return;
  }
  const startDateInput = document.getElementById("startDate").value;
  const endDateInput = document.getElementById("endDate").value;
  const vesselColumnIndex = document.getElementById("vesselColumn").value;
  const statusFilter = document.getElementById("statusColumn").value;
  //console.log("Vessel Column Index Selected:", vesselColumnIndex);
  const startDate = startDateInput ? new Date(startDateInput) : null;
  const endDate = endDateInput ? new Date(endDateInput) : null;
  let filteredData = originalData;
  if (startDate && endDate) {
    filteredData = filteredData.filter((row) => {
      let dateValue = row["1st Employ"]
        ? convertExcelDate(row["1st Employ"])
        : null;
      return dateValue && dateValue >= startDate && dateValue <= endDate;
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
    filteredData.sort((a, b) => {
      const valA = parseFloat(a[vesselColumn]) || 0;
      const valB = parseFloat(b[vesselColumn]) || 0;
      return valB - valA;
    });
    // console.log("Sorted Data on column", vesselColumn, filteredData);
    displayDataWithColor(filteredData, vesselColumn);
  } else {
    displayData(filteredData);
  }
}

function displayDataWithColor(data, vesselColumn) {
  const table = document.getElementById("dataTable");
  table.innerHTML = "";
  if (!data || data.length === 0) {
    table.innerHTML = `<tr>
      <td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>
        No records found.
      </td></tr>`;
    return;
  }
  const maxValue = Math.max(
    ...data.map((row) => parseFloat(row[vesselColumn]) || 0)
  );
  // console.log("Max Value for Gradient:", maxValue);
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
      td.textContent = row[key];
      if (key === vesselColumn) {
        const value = parseFloat(row[key]) || 0;
        const intensity = maxValue > 0 ? value / maxValue : 0; // Avoid division by zero
        td.style.backgroundColor = `rgba(0, 255, 0, ${intensity})`; // Green fade effect
        // console.log(`Coloring ${value} with opacity ${intensity}`);
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

function resetData() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("vesselColumn").value = "null";
  document.getElementById("statusColumn").value = "null";
  if (!originalData || originalData.length === 0) {
    document.getElementById("dataTable").innerHTML = `<tr>
      <td colspan='100%' style='border: 2px solid red; text-align: center; padding: 10px'>
        No Excel file uploaded. Please upload a file before filtering.
      </td></tr>`;
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
