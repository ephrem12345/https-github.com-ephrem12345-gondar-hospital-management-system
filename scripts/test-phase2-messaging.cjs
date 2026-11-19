const http = require("http");

const BASE_URL = "http://localhost:4000/api/v1";

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
    const reqOptions = {
      method: options.method || "GET",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers["content-type"] || "";
        let data = null;
        if (contentType.includes("application/json")) {
          try {
            data = JSON.parse(buffer.toString("utf8"));
          } catch {
            data = buffer.toString("utf8");
          }
        } else {
          data = buffer;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          cookies: res.headers["set-cookie"] || [],
        });
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function extractCookie(cookieArray, name) {
  for (const c of cookieArray) {
    const parts = c.split(";")[0].split("=");
    if (parts[0] === name) return parts[1];
  }
  return null;
}

async function loginUser(email, password = "StaffPassword123") {
  const res = await request("/auth/login", {
    method: "POST",
    body: { identifier: email, password, remember: false },
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} with HTTP ${res.status}: ${JSON.stringify(res.data)}`);
  }
  const token = extractCookie(res.cookies, "ghms_access");
  return {
    user: res.data.data,
    token,
    authHeader: { Cookie: `ghms_access=${token}` },
  };
}

async function runPhase2MessagingIntegrationTests() {
  console.log("================================================================================");
  console.log("GHMS PHASE 2: ADVANCED ENTERPRISE PRIVATE MESSAGING INTEGRATION TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Actors
    console.log("--> 1. Authenticating key actors (Administrator, Doctor, Staff)...");
    const admin = await loginUser("abebe.bekele@gondar-hospital.et");
    assert(admin.user.role === "Administrator", "Administrator authenticated successfully");

    const doctor = await loginUser("selam.girma@gondar-hospital.et");
    assert(doctor.user.role === "Doctor", "Doctor (Dr. Selam Girma) authenticated successfully");

    // 2. Query Staff Directory
    console.log("\n--> 2. Testing Staff Directory Query (Doctor)...");
    const dirRes = await request("/clinical-messages/staff-directory", {
      headers: doctor.authHeader,
    });
    console.log("DEBUG dirRes:", dirRes.status, dirRes.data);
    assert(dirRes.status === 200, "Staff directory query returned HTTP 200");
    const directory = dirRes.data?.data || [];
    assert(Array.isArray(directory) && directory.length > 0, `Directory contains ${directory.length} staff members`);

    // Find or create nurse / second participant
    let targetStaff = directory.find((s) => s.id !== doctor.user.id && s.role !== "PATIENT");
    if (!targetStaff) {
      targetStaff = { id: admin.user.id, name: admin.user.firstName, role: "ADMINISTRATOR" };
    }
    console.log(`     Target colleague: ${targetStaff.name || targetStaff.firstName} (${targetStaff.role})`);

    // 3. Privacy-Preserving Admin Metrics Verification & RBAC Boundary
    console.log("\n--> 3. Verifying Privacy-Preserving Administrative Metrics (/admin/metrics)...");
    const adminMetrics = await request("/clinical-messages/admin/metrics", {
      headers: admin.authHeader,
    });
    console.log("DEBUG adminMetrics:", adminMetrics.status, adminMetrics.data);
    assert(adminMetrics.status === 200, "Administrator can access /admin/metrics (HTTP 200)");
    assert(typeof adminMetrics.data?.data?.messages?.total === "number", "Aggregate total messages returned");
    assert(typeof adminMetrics.data?.data?.messages?.escalatedToSupervisor === "number", "Aggregate escalation count returned");
    assert(typeof adminMetrics.data?.data?.conversations?.total === "number", "Aggregate total conversations returned");
    assert(typeof adminMetrics.data?.data?.serviceStatus === "string", "Service status HEALTHY returned");
    assert(adminMetrics.data?.data?.messages?.items === undefined, "Privacy boundary intact: raw message text items are NOT exposed to administrator");

    // Doctor attempting to access /admin/metrics must get 403 Forbidden
    const doctorDenied = await request("/clinical-messages/admin/metrics", {
      headers: doctor.authHeader,
    });
    assert(doctorDenied.status === 403, "Non-administrator (Doctor) is strictly forbidden from /admin/metrics (HTTP 403)");

    // 4. Create 1:1 Direct Conversation (Doctor -> Nurse/Staff)
    console.log("\n--> 4. Creating Direct 1:1 Conversation...");
    const createConvRes = await request("/clinical-messages/conversations", {
      method: "POST",
      headers: doctor.authHeader,
      body: {
        type: "DIRECT",
        title: "Clinical Consultation",
        memberIds: [targetStaff.id],
      },
    });
    assert(createConvRes.status === 201, "Direct conversation created successfully (HTTP 201)");
    const conversationId = createConvRes.data?.data?.id;
    assert(Boolean(conversationId), `Conversation ID obtained: ${conversationId}`);

    // 5. Send High-Priority Clinical Instruction in Conversation
    console.log("\n--> 5. Sending Clinical Instruction with URGENT Priority...");
    const sendMsgRes = await request(`/clinical-messages/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: doctor.authHeader,
      body: {
        content: "Administer 100mg IV hydrocortisone immediately and observe respiratory rate.",
        category: "CLINICAL_INSTRUCTION",
        priority: "URGENT",
        subject: "Urgent Bronchospasm Protocol",
      },
    });
    assert(sendMsgRes.status === 201, "Urgent clinical message posted successfully (HTTP 201)");
    const messageId = sendMsgRes.data?.data?.id;
    assert(Boolean(messageId), `Message ID: ${messageId}`);
    assert(sendMsgRes.data?.data?.priority === "URGENT", "Message priority verified as URGENT");

    // 6. Explicit Clinical Acknowledgment (Separated from Read Receipt)
    console.log("\n--> 6. Verifying Clinical Acknowledgment Workflow...");
    // First: Read receipt
    const readRes = await request(`/clinical-messages/${messageId}/read`, {
      method: "POST",
      headers: admin.authHeader,
    });
    assert(readRes.status === 200, "Message marked as READ (HTTP 200)");

    // Second: Explicit clinical acknowledgment with verification notes
    const ackRes = await request(`/clinical-messages/${messageId}/acknowledge`, {
      method: "POST",
      headers: admin.authHeader,
      body: {
        notes: "Verified: Hydrocortisone 100mg IV administered at bedside. Post-dose vitals stable.",
      },
    });
    assert(ackRes.status === 200, "Message explicitly ACKNOWLEDGED with clinical notes (HTTP 200)");
    assert(ackRes.data?.data?.success === true, "Acknowledgment success returned true");
    assert(Boolean(ackRes.data?.data?.acknowledgedAt), "Acknowledgment timestamp recorded");

    // 7. Message-to-Task Conversion (ClinicalTask)
    console.log("\n--> 7. Converting Clinical Message to Structured Task (ClinicalTask)...");
    const taskRes = await request(`/clinical-messages/${messageId}/convert-task`, {
      method: "POST",
      headers: doctor.authHeader,
      body: {
        taskType: "VITAL_SIGNS_MONITORING",
        title: "Q15M Vital Signs Check Post-Hydrocortisone",
        description: "Recheck blood pressure, SpO2, and pulse every 15 minutes for 1 hour.",
        department: "Internal Medicine",
        priority: "URGENT",
        assignedToId: targetStaff.id,
      },
    });
    assert(taskRes.status === 201, "Clinical task created successfully from message (HTTP 201)");
    const task = taskRes.data?.data;
    assert(task && task.taskNumber && task.taskNumber.startsWith("TSK-"), `Structured task number generated: ${task?.taskNumber}`);
    assert(task.status === "PENDING", "Task starts with status PENDING");

    // Progress task status to IN_PROGRESS and then COMPLETED
    console.log("\n--> 8. Testing Clinical Task Status Progression...");
    const taskProgressRes = await request(`/clinical-messages/tasks/${task.id}/status`, {
      method: "PATCH",
      headers: admin.authHeader,
      body: {
        status: "IN_PROGRESS",
      },
    });
    assert(taskProgressRes.status === 200, "Task transitioned to IN_PROGRESS (HTTP 200)");

    const taskCompleteRes = await request(`/clinical-messages/tasks/${task.id}/status`, {
      method: "PATCH",
      headers: admin.authHeader,
      body: {
        status: "COMPLETED",
        completionNotes: "All 4 vital signs checks completed within normal ranges. SpO2 98% on room air.",
      },
    });
    assert(taskCompleteRes.status === 200, "Task transitioned to COMPLETED with notes (HTTP 200)");
    assert(taskCompleteRes.data?.data?.status === "COMPLETED", "Task status is COMPLETED");

    // 9. Supervisor Safety Escalation Workflow
    console.log("\n--> 9. Testing Supervisor Safety Escalation Workflow...");
    // Create an unacknowledged STAT message
    const statMsgRes = await request(`/clinical-messages/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: doctor.authHeader,
      body: {
        content: "CRITICAL: Severe bradycardia observed in bed 8. Requesting immediate physician review.",
        category: "CLINICAL_INSTRUCTION",
        priority: "CRITICAL",
        subject: "STAT Cardiac Emergency",
      },
    });
    const statMsgId = statMsgRes.data?.data?.id;

    // Escalate message to supervisor
    const escalateRes = await request(`/clinical-messages/${statMsgId}/escalate`, {
      method: "POST",
      headers: doctor.authHeader,
      body: {
        supervisorId: admin.user.id,
        reason: "Unacknowledged STAT emergency after 5 minutes.",
      },
    });
    assert(escalateRes.status === 200, "Safety escalation triggered successfully (HTTP 200)");
    assert(escalateRes.data?.data?.isEscalated === true, "Message marked as isEscalated: true");
    assert(Boolean(escalateRes.data?.data?.escalatedAt), "Escalation timestamp recorded");
    assert(escalateRes.data?.data?.escalatedToId === admin.user.id, "Supervisor ID correctly recorded");

    // 10. Secure Attachment Upload & Authenticated Download
    console.log("\n--> 10. Testing Secure Clinical Attachment Sharing...");
    const sampleAttachmentPayload = {
      fileName: "ecg_strip_lead_ii.png",
      fileType: "image/png",
      fileBase64: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64").toString("base64"),
    };
    const uploadRes = await request(`/clinical-messages/${messageId}/attachments`, {
      method: "POST",
      headers: doctor.authHeader,
      body: sampleAttachmentPayload,
    });
    assert(uploadRes.status === 201, "Attachment uploaded securely (HTTP 201)");
    const attachmentId = uploadRes.data?.data?.id;
    assert(Boolean(attachmentId), `Attachment ID: ${attachmentId}`);

    // Download attachment
    const downloadRes = await request(`/clinical-messages/attachments/${attachmentId}/download`, {
      headers: admin.authHeader,
    });
    assert(downloadRes.status === 200, "Authenticated attachment download returned HTTP 200");
    assert(downloadRes.headers["content-type"].includes("image/png"), "Content-Type matches uploaded image/png");

    // 11. Staff Availability & Communication Settings
    console.log("\n--> 11. Updating User Communication & Presence Settings...");
    const updateSettingsRes = await request("/clinical-messages/settings", {
      method: "PATCH",
      headers: doctor.authHeader,
      body: {
        availabilityStatus: "IN_SURGERY",
        statusMessage: "In OR-1 for emergency laparotomy until 17:00",
        soundEnabled: true,
        emailNotifications: true,
        minNotificationPriority: "URGENT",
      },
    });
    assert(updateSettingsRes.status === 200, "Communication settings updated (HTTP 200)");
    assert(updateSettingsRes.data?.data?.availabilityStatus === "IN_SURGERY", "Presence status set to IN_SURGERY");
    assert(updateSettingsRes.data?.data?.statusMessage.includes("In OR-1"), "Status message persisted");

    // 12. Department Channel Creation (Emergency Department)
    console.log("\n--> 12. Creating Department Broadcast Channel (Emergency)...");
    const deptConvRes = await request("/clinical-messages/conversations", {
      method: "POST",
      headers: doctor.authHeader,
      body: {
        type: "DEPARTMENT",
        department: "Emergency",
        title: "Emergency Department Rapid Response",
        memberIds: [targetStaff.id],
      },
    });
    assert(deptConvRes.status === 201, "Department channel created successfully (HTTP 201)");
    assert(deptConvRes.data?.data?.department === "Emergency", "Department channel correctly bound to Emergency");

    // 13. Summary
    console.log("\n================================================================================");
    console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("\nUnexpected test suite error:", err);
    process.exit(1);
  }
}

runPhase2MessagingIntegrationTests();
