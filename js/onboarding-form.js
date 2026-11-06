(function () {
  const form = document.getElementById("onboarding-form");
  if (!form) return;

  const configurations = [
    { value: "Engineering", description: "Dell Pro Max 16 Plus (MB16250)" },
    { value: "Standard LP", description: "Dell Pro 5 14 (P514260)" },
    { value: "Sales / Exec", description: "Dell Pro 7 13 2-in-1 (P703260)" },
    { value: "Engineering DT", description: "Dell Pro Max Tower T2 (FCT2250)" },
    { value: "All in One PC", description: "Dell Pro 24 All-in-One Plus Touch, U5 / 32 GB / 512 GB / Wi-Fi" },
    { value: "Standard DT", description: "Dell Pro Slim Plus (QBS1250)" },
    { value: "Rugged Laptop", description: "Dell Pro Rugged 14 (RB14250)" },
    { value: "Rugged Tablet", description: "Dell Pro Rugged 12 (RA02260)" }
  ];

  const printingOptions = [
    {
      value: "Standard printer access",
      label: "Standard printer access",
      href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=6d84cfe2dbd31f04b1af38ff9d96196c"
    },
    {
      value: "Oracle printer access",
      label: "Oracle printer access",
      href: "https://vertiv.service-now.com/sp_vertiv?id=sc_cat_item&sys_id=3c25660edbe837c0b1af38ff9d9619f0"
    }
  ];

  const systemAccess = [
    ["Oracle - Alice & Allan", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=aa9e698387b11150256fec609bbb357f&table=sc_cat_item&searchTerm=alice"],
    ["Oracle - Donna & Onida", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=9408ba4d1be38990dcb6a861604bcbdf"],
    ["Oracle Fusion", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=c436c72fdbe79b44b1af38ff9d9619d0"],
    ["Oracle Fusion - CPQ", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=cbe89b421bc22490364e6535624bcb08"],
    ["Network Drives", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=90407c48db0a3b00f5973c8f9d961934"],
    ["SharePoint", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=c755597cdbdefe00f5973c8f9d9619a5"],
    ["Technical Knowledge Online (TKO)", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=c4717562db1c4300f5973c8f9d9619da"],
    ["Desk Phone", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=6374fba9db308300f5973c8f9d961940"],
    ["K2 Cloud - APAC", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=e83ea5f41bcaa850364e6535624bcbd8"],
    ["USB exception", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=8f7f56fb1bf0b850364e6535624bcb3d"],
    ["Enterprise Global Expense Platform (Chrome River)", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=18e02c8cdb1c2300f5973c8f9d96193f"],
    ["Fleet Driver Okta Tile", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=0fd0745cdbf693c0b1af38ff9d96199e"],
    ["Mobile Phone", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=631cc769db748f00b1af38ff9d96190e"],
    ["Email Distribution List", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=fe8202f6db137a00b1af38ff9d96194c"],
    ["Local Admin Access", "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=fcb2d9801b0e011066242025604bcb25"],
    ["Missing Okta tile", "https://vertiv.service-now.com/esc?id=sc_cat_item&table=sc_cat_item&sys_id=0fd0745cdbf693c0b1af38ff9d96199e&searchTerm=okta%20tiles"]
  ];

  const accessories = [
    "Wireless Mouse",
    "Wireless Keyboard",
    "Wired Mouse",
    "Wired Keyboard",
    "USB Headset",
    "Docking Station",
    "Monitor",
    "Dual Monitors",
    "Back Pack"
  ];

  const softwarePages = [
    [
      {
        label: "6Sigma Applications",
        description: "6Sigma software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=488f21bfebb7a6503cdcfc43cad0cd19"
      },
      {
        label: "Adobe Products",
        description: "Access request for Adobe products.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=f1b547a6ebaabe543cdcfc43cad0cdc6"
      },
      {
        label: "Airtame",
        description: "Wireless screen sharing and digital signage.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=49153a96fb99b2d01655ff977befdc17"
      },
      {
        label: "Ansys Applications",
        description: "Ansys software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=063b1711eb80be903cdcfc43cad0cdf0"
      },
      {
        label: "AutoDesk Applications",
        description: "AutoDesk software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=4ccfece53b84fa50d605a7ac24e45a23"
      },
      {
        label: "BlueBeam",
        description: "Drawing markup and document control.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=99ddfc72eb8bb6503cdcfc43cad0cd8c"
      },
      {
        label: "CEEE Coil Designer",
        description: "CEEE Coil Designer software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=4672661beb8436143cdcfc43cad0cddc"
      },
      {
        label: "Docker Desktop",
        description: "Container management GUI for Windows.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=51979fbffb82f6541655ff977befdc50"
      },
      {
        label: "EES (Engineering Equation Solver)",
        description: "EES software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=62f6154beb8cbed03cdcfc43cad0cd23"
      },
      {
        label: "EPLAN",
        description: "EPLAN Electric P8 software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=7885d78ffb8432901655ff977befdcd5"
      },
      {
        label: "ETAP",
        description: "Electrical Transient Analyzer Program.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=16484f8ffb4432901655ff977befdcb6"
      },
      {
        label: "Flownex",
        description: "Flownex software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=700d3535ebc872d03cdcfc43cad0cda5"
      },
      {
        label: "Genesys Cloud Agent Onboarding",
        description: "Contact center agent.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=36abfa931b79555066242025604bcb01"
      },
      {
        label: "Grupo Tress",
        description: "Access request for Grupo Tress and Grupo Tress Supervisores.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=034a2102ebfdba103cdcfc43cad0cdc4"
      },
      {
        label: "Matlab",
        description: "Engineering and mathematical computing.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=185369d7fbf4be141655ff977befdc97"
      },
      {
        label: "MicroMain",
        description: "Maintenance management platform.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=d9f49d82eb55b2103cdcfc43cad0cdd8"
      }
    ],
    [
      {
        label: "Microsoft Copilot",
        description: "AI assistant for Microsoft 365 productivity tasks.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=214a18aa3b687e90d605a7ac24e45a07"
      },
      {
        label: "Microsoft Office 365",
        description: "Cloud-based productivity apps for collaboration.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=ad20ca24fb2cfe101655ff977befdc2d"
      },
      {
        label: "Microsoft Power BI Translator Builder",
        description: "Build multilingual Power BI dashboards.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=b79f4532eb683e503cdcfc43cad0cd88"
      },
      {
        label: "Microsoft Project and Planner",
        description: "Plan, track, and manage projects.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=28cbea43fb603a901655ff977befdc64"
      },
      {
        label: "Microsoft SQL Server",
        description: "Manage and query relational databases.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=ecf4ee38eb28ba103cdcfc43cad0cd76"
      },
      {
        label: "Microsoft Teams license add-ons",
        description: "Extend Teams features with additional capabilities.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=51cad1b2eba83e503cdcfc43cad0cde4"
      },
      {
        label: "Microsoft Visio",
        description: "Create diagrams and visual representations.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=a9f7b00dfb3cbad01655ff977befdcc2"
      },
      {
        label: "Microsoft Visual Studio",
        description: "Develop applications across platforms.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=07ab8f94fbf8b2d01655ff977befdcf2"
      },
      {
        label: "Milestone System",
        description: "Video Management System (VMS).",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=0c6becde3ba9f254d605a7ac24e45a31"
      },
      {
        label: "Minitab",
        description: "Statistical software.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=b9bc59caeb95b2103cdcfc43cad0cd48"
      },
      {
        label: "Nitro Pro",
        description: "PDF editing and eSigning solution.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=424c6ea23b3cba50d605a7ac24e45a55"
      },
      {
        label: "Oracle Java",
        description: "Oracle Java software installation.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=d6b4d729eb8e76d03cdcfc43cad0cd69"
      },
      {
        label: "PTC Applications",
        description: "PTC software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=88029d91fb736e101655ff977befdcdd"
      },
      {
        label: "Siemens Applications",
        description: "Siemens software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=3e78a8b73b40b2d0d605a7ac24e45ad2"
      },
      {
        label: "Sigmaxim",
        description: "Sigmaxim software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=9c32a819fb087a101655ff977befdcff"
      },
      {
        label: "Simio",
        description: "3D simulation and digital twin platform.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=39445ddcebbb2a103cdcfc43cad0cd2d"
      }
    ],
    [
      {
        label: "Software Not Found in Catalog",
        description: "Search the catalog first, then use this request if the software is not listed.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=526a292edbd84300f5973c8f9d9619a5"
      },
      {
        label: "Solid Edge",
        description: "Solid Edge software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=a9b9e705fb483a101655ff977befdcaf"
      },
      {
        label: "Solidworks (Dassault)",
        description: "Solidworks software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=5217c433fbc83a901655ff977befdc0c"
      },
      {
        label: "Teamcenter (China)",
        description: "Teamcenter (China) software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=8f357df0eb083a903cdcfc43cad0cd07"
      },
      {
        label: "TechSmith Snagit",
        description: "Screen capture tool.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=3ea8a528ebfafed43cdcfc43cad0cda0"
      },
      {
        label: "Thermal Rating Software (CRS & NewHirating)",
        description: "Thermal business simulation and product rating software.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=4bd31d52eb2676543cdcfc43cad0cd0c"
      },
      {
        label: "TimerPro",
        description: "Video-based measurement and continuous improvement.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=399084e5eb19f6903cdcfc43cad0cdb0"
      },
      {
        label: "Tortoise SVN",
        description: "Tool for SVN management requirements.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=f5a13673fb4ab6541655ff977befdc84"
      },
      {
        label: "Vertiv Smart Torque",
        description: "Quality control system.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=997854e73b8df610d605a7ac24e45a15"
      },
      {
        label: "Virtualization Software",
        description: "Virtualization software installation.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=4b78ead0fb82b2d01655ff977befdc66"
      },
      {
        label: "XPLM / Agile EC CAD Connector",
        description: "XPLM / Agile EC CAD software installation request.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=80ac7c70eb44f6903cdcfc43cad0cd2a"
      },
      {
        label: "ZWSOFT Zhongwang CAD (ZWCAD)",
        description: "Tool for creating and reviewing design diagrams.",
        href: "https://vertiv.service-now.com/esc?id=sc_cat_item&sys_id=f0d88239fb01f6941655ff977befdcfb"
      }
    ]
  ];

  const stepTitles = [
    "Employee information",
    "Computer configuration",
    "Hardware, printing, and system access",
    "Computer accessories",
    "Software selection · 1 of 3",
    "Software selection · 2 of 3",
    "Software selection · 3 of 3",
    "Notes and completion"
  ];

  let currentStep = 1;
  const steps = Array.from(form.querySelectorAll("[data-step-panel]"));
  const currentStepLabel = document.getElementById("current-step-label");
  const stepCount = document.getElementById("step-count");
  const progress = document.getElementById("step-progress");
  const backButton = form.querySelector('[data-action="back"]');
  const nextButton = form.querySelector('[data-action="next"]');

  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  function makeOptionCard(options, name, type, printLabel) {
    const fragment = document.createDocumentFragment();
    options.forEach(function (option) {
      const label = document.createElement("label");
      label.className = "option-card";
      const input = document.createElement("input");
      input.type = type || "checkbox";
      input.name = name;
      input.value = option.value;
      input.dataset.printLabel = printLabel || option.value;
      if (type === "radio") input.required = false;
      label.appendChild(input);

      const copy = document.createElement("span");
      copy.className = "option-copy";
      const title = document.createElement("strong");
      title.textContent = option.value;
      copy.appendChild(title);
      if (option.description) {
        const description = document.createElement("small");
        description.textContent = option.description;
        copy.appendChild(description);
      }
      label.appendChild(copy);
      fragment.appendChild(label);
    });
    return fragment;
  }

  function makeCatalogCard(item, name, printLabel) {
    const card = document.createElement("div");
    card.className = "catalog-card";
    card.dataset.searchText = `${item.label} ${item.description || ""}`.toLowerCase();

    const label = document.createElement("label");
    label.className = "option-card";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.value = item.label;
    input.dataset.printLabel = printLabel || item.label;
    label.appendChild(input);

    const copy = document.createElement("span");
    copy.className = "option-copy";
    const title = document.createElement("strong");
    title.textContent = item.label;
    copy.appendChild(title);
    if (item.description) {
      const description = document.createElement("small");
      description.textContent = item.description;
      copy.appendChild(description);
    }
    label.appendChild(copy);

    const request = document.createElement("a");
    request.className = "request-link";
    request.href = item.href;
    request.target = "_blank";
    request.rel = "noopener noreferrer";
    request.textContent = "Request";
    request.setAttribute("aria-label", `Open ServiceNow request for ${item.label}`);
    card.append(label, request);
    return card;
  }

  function renderCatalog(targetId, items, name, printLabel) {
    const container = document.getElementById(targetId);
    container.replaceChildren(...items.map(function (item) {
      return makeCatalogCard(item, name, printLabel);
    }));
    updateCatalogCount(container);
  }

  function updateCatalogCount(container) {
    const stepNumber = container.id.slice(-1);
    const count = Array.from(container.querySelectorAll('input[type="checkbox"]'))
      .filter(function (input) { return input.checked; }).length;
    document.getElementById(`software-count-${stepNumber}`).textContent =
      `${count} selected`;
  }

  document.getElementById("computer-configurations").appendChild(
    makeOptionCard(configurations, "computer_configuration", undefined, "Computer configuration")
  );
  document.getElementById("printing-options").appendChild(
    makeCatalogCard(printingOptions[0], "printing", "Printing")
  );
  document.getElementById("printing-options").appendChild(
    makeCatalogCard(printingOptions[1], "printing", "Printing")
  );
  document.getElementById("system-access-options").replaceChildren(
    ...systemAccess.map(function (item) {
      return makeCatalogCard(
        { label: item[0], href: item[1] },
        "system_access",
        "Additional system access"
      );
    })
  );
  document.getElementById("accessory-options").appendChild(
    makeOptionCard(accessories.map(function (value) {
      return { value };
    }), "accessories", undefined, "Requested accessory")
  );

  softwarePages.forEach(function (items, index) {
    renderCatalog(`software-list-${index + 1}`, items, "software", "Software selection");
  });

  function showStep(nextStep, moveFocus) {
    currentStep = Math.max(1, Math.min(steps.length, nextStep));
    steps.forEach(function (step, index) {
      step.hidden = index + 1 !== currentStep;
    });
    currentStepLabel.textContent = `Step ${currentStep}: ${stepTitles[currentStep - 1]}`;
    stepCount.textContent = `${currentStep} of ${steps.length}`;
    progress.value = currentStep;
    progress.textContent = `${currentStep} of ${steps.length}`;
    backButton.disabled = currentStep === 1;
    nextButton.hidden = currentStep === steps.length;
    if (moveFocus) {
      steps[currentStep - 1].querySelector("h3").focus();
    }
  }

  steps.forEach(function (step) {
    const heading = step.querySelector("h3");
    if (heading) heading.tabIndex = -1;
  });

  backButton.addEventListener("click", function () {
    showStep(currentStep - 1, true);
  });
  nextButton.addEventListener("click", function () {
    showStep(currentStep + 1, true);
  });

  form.querySelectorAll("[data-shipping-choice]").forEach(function (input) {
    input.addEventListener("change", function () {
      const shippingFields = document.getElementById("shipping-fields");
      const shippingRequired = input.dataset.shippingChoice === "yes";
      shippingFields.hidden = !shippingRequired;
      if (!shippingRequired) {
        shippingFields.querySelectorAll("input").forEach(function (field) {
          field.value = "";
        });
      }
    });
  });

  form.querySelectorAll("[data-software-search]").forEach(function (search) {
    search.addEventListener("input", function () {
      const container = document.getElementById(search.dataset.softwareSearch);
      const query = search.value.trim().toLowerCase();
      container.querySelectorAll(".catalog-card").forEach(function (card) {
        card.hidden = !card.dataset.searchText.includes(query);
      });
    });
  });

  form.addEventListener("change", function (event) {
    const input = event.target;
    if (input.matches('input[type="checkbox"]') && input.closest(".catalog-grid")) {
      updateCatalogCount(input.closest(".catalog-grid"));
    }
  });

  function buildCompletedSummary() {
    const summary = document.getElementById("print-summary");
    summary.replaceChildren();

    const title = document.createElement("h1");
    title.textContent = "Vertiv New Employee Onboarding & IT Provisioning Questionnaire";
    summary.appendChild(title);

    const employeeName = document.getElementById("employee-name").value.trim();
    const startDate = document.getElementById("start-date").value;
    const dateLine = document.createElement("p");
    const details = [];
    if (employeeName) details.push(employeeName);
    if (startDate) details.push(`Start date: ${startDate}`);
    details.push(`Prepared: ${new Date().toLocaleDateString()}`);
    dateLine.textContent = details.join(" · ");
    summary.appendChild(dateLine);

    steps.forEach(function (step) {
      const entries = [];
      step.querySelectorAll("input, textarea, select").forEach(function (input) {
        let value = "";
        if (input.type === "checkbox" || input.type === "radio") {
          if (!input.checked) return;
          value = input.value || "Selected";
        } else {
          value = input.value.trim();
          if (!value) return;
        }

        const label = input.dataset.printLabel;
        if (label) entries.push(label === value ? label : `${label}: ${value}`);
      });

      if (!entries.length) return;
      const heading = document.createElement("h2");
      heading.textContent = step.querySelector("h3").textContent;
      summary.appendChild(heading);
      const list = document.createElement("ul");
      entries.forEach(function (entry) {
        const item = document.createElement("li");
        item.textContent = entry;
        list.appendChild(item);
      });
      summary.appendChild(list);
    });

    summary.hidden = false;
    return summary;
  }

  function clearCompletedSummary() {
    const summary = document.getElementById("print-summary");
    summary.hidden = true;
    summary.replaceChildren();
  }

  form.querySelector('[data-action="download"]').addEventListener("click", function () {
    const status = document.getElementById("download-status");
    if (!window.Blob || !window.URL || typeof window.URL.createObjectURL !== "function") {
      status.textContent = "Your browser cannot download a completed copy. Use Print / Save completed form instead.";
      return;
    }

    const summary = buildCompletedSummary();
    const documentContent = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Completed New Hire Onboarding Form</title>
  <style>
    body { margin: 0; padding: 24px; color: #171717; font: 16px/1.5 Arial, Helvetica, sans-serif; }
    main { max-width: 850px; margin: 0 auto; }
    h1 { padding-bottom: 12px; border-bottom: 4px solid #fe5b1b; font-size: 24px; }
    h2 { margin: 24px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #bbb; font-size: 18px; }
    ul { padding-left: 22px; }
    li { margin-bottom: 6px; white-space: pre-wrap; overflow-wrap: anywhere; }
    @media print { body { padding: 0; } h2 { break-after: avoid; } }
    @media (max-width: 600px) { body { padding: 16px; } h1 { font-size: 21px; } }
  </style>
</head>
<body><main>${summary.innerHTML}</main></body>
</html>`;
    const employeeName = document.getElementById("employee-name").value.trim();
    const startDate = document.getElementById("start-date").value;
    const safeName = employeeName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    const fileName = `${safeName || "completed-onboarding-form"}${startDate ? `-${startDate}` : ""}.html`;

    try {
      const file = new Blob([documentContent], { type: "text/html;charset=utf-8" });
      const fileUrl = window.URL.createObjectURL(file);
      const downloadLink = document.createElement("a");
      downloadLink.href = fileUrl;
      downloadLink.download = fileName;
      downloadLink.hidden = true;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(function () {
        window.URL.revokeObjectURL(fileUrl);
      }, 1000);
      status.textContent = "Your completed form was downloaded. Check your browser's Downloads or the Files app.";
    } catch (error) {
      console.error("Could not download the completed onboarding form.", error);
      status.textContent = "The completed form could not be downloaded. Use Print / Save completed form instead.";
    } finally {
      clearCompletedSummary();
    }
  });

  form.querySelector('[data-action="print"]').addEventListener("click", function () {
    buildCompletedSummary();
    document.body.classList.add("is-printing");
    window.print();
  });

  window.addEventListener("afterprint", function () {
    document.body.classList.remove("is-printing");
    clearCompletedSummary();
  });

  showStep(1, false);
})();
