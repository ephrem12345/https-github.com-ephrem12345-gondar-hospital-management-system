# Gondar Hospital Management System (GHMS)
## Clinical Staff & Patient User Guide

**Document Version:** 1.0  
**Effective Date:** November 15, 2026  
**Audience:** Hospital Physicians, Nurses, Clinical Staff, Receptionists, Pharmacists, and Patients  
**Language Support:** English / Amharic (አማርኛ)  

---

## 1. System Access & Language Selection

### 1.0 Starting the System Locally
1. In the project folder, double-click **`start-ghms.bat`** (or run `npm run dev:safe` in PowerShell).
2. Wait until the launcher confirms the API and web app are healthy.
3. Open **`http://localhost:3000`** in Chrome, Firefox, Safari, or Edge.
4. To stop everything safely, double-click **`stop-ghms.bat`**.

### 1.1 Navigating to the System
- **Local development:** `http://localhost:3000`
- **Backend API:** `http://localhost:4000/api/v1`
- **API documentation:** `http://localhost:4000/api/docs`
- In a hosted deployment, use the HTTPS domain supplied by your administrator.
- **Language Switcher:** Use the language selector in the public-site header or the dashboard top bar to switch between **English** and **አማርኛ (Amharic)**. Labels update immediately.

### 1.2 Role Selection Landing Page
The GHMS landing page features dedicated login cards for each hospital role:
1. **Administrator Login**
2. **Doctor Login**
3. **Nurse Login**
4. **Laboratory Staff Login**
5. **Pharmacist Login**
6. **Receptionist Login**
7. **Patient Portal Login**

Click your designated card to be routed directly to the tailored authentication screen.

### 1.3 Understanding the Staff Dashboard
After signing in, the dashboard has four consistent areas:
1. **Left sidebar:** grouped navigation (Dashboard, Patient Services, Clinical Services, Departments, Diagnostics, Pharmacy, Facilities, Finance, HR, Management, Administration). Use the arrow beside a group to expand or collapse it. The top-left button collapses the sidebar to icons.
2. **Top bar:** page title, breadcrumbs, global search, language switcher, theme switcher, clinical messages, notifications, and profile menu.
3. **Main content:** page heading, actions, tables, and forms. Always read the page description before entering data.
4. **Footer:** system identification and authorized-access notice.

Use **Global Search** to jump between modules. Breadcrumbs always show where you are: *Home › Group › Page*.

---

## 2. Receptionist Workflows

### 2.1 Registering a New Patient
1. Navigate to **Patients** -> **New Patient Registration**.
2. Complete demographic details: Full Name, Gender, Date of Birth, Phone Number, Address, and Emergency Contact.
3. Submit the form. The system generates an official identifier in the format `GHMS-XXXXXX`.
4. Provide the patient with their unique Hospital ID card.

### 2.2 Booking an Outpatient Appointment
1. Navigate to **Appointments & Queue** -> **Book Appointment**.
2. Search for the patient by Name, Phone, or Hospital Number (`GHMS-XXXXXX`).
3. Select Department (e.g. *Internal Medicine*, *Pediatrics*, *Surgery*).
4. Select the Attending Physician and choose an open 30-minute consultation slot.
5. Enter the clinical reason for visit and click **Confirm Booking**.

### 2.3 Patient Check-In & Queue Token Issuance
1. On the day of the patient's visit, open the **Department Queue** screen.
2. Select the appointment and click **Check In**.
3. The system assigns a Department Queue Token Number (e.g., `#1`, `#2`) and routes the patient to the designated waiting lobby.

---

## 3. Physician (Doctor) Workflows

### 3.1 Managing Consultation Queue
1. Log in with your physician credentials.
2. The dashboard displays the live waiting queue for your department.
3. Click **Call Next Patient** when ready to admit a patient. The public lobby display board announces the token and directs the patient to your examination room.

### 3.2 Clinical Consultation & Diagnosis
1. Under the active consultation tab, review patient historical vitals, allergies, and prior visits.
2. Record clinical observations: Presenting Complaints, History of Present Illness (HPI), and Physical Examination findings.
3. Record formal working or confirmed diagnoses using standard ICD-10 terminology.
4. Click **Finalize Consultation Note**.

### 3.3 Ordering Laboratory Investigations & Prescriptions
1. **Order Lab Tests:** Click **Add Lab Order**, choose the test (e.g. *Complete Blood Count (CBC)*, *Urinalysis*, *Lipid Panel*), specify clinical priority (*Routine* or *Urgent*), and submit.
2. **Issue Prescription:** Click **New Prescription**, select medication from the hospital formulary, prescribe dosage, frequency, and duration, and sign electronically.

---

## 4. Nurse & Inpatient Workflows

### 4.1 Recording Vital Signs
1. Select the admitted patient.
2. Record Blood Pressure (mmHg), Heart Rate (bpm), Respiratory Rate, Temperature (°C), Oxygen Saturation (SpO2), and Pain Scale (0–10).
3. The system highlights abnormal readings in real-time.

### 4.2 Inpatient Bed Management
1. **Admission:** Select an available bed in the assigned ward and confirm room transfer.
2. **Care Notes:** Enter shift nursing care notes and administration of scheduled intravenous fluids/medications.
3. **Discharge:** Upon physician sign-off, verify discharge summary instructions and update bed status to release it for sanitation.

---

## 5. Laboratory Technologist Workflows

### 5.1 Specimen Processing & Verification
1. Access **Laboratory Worklist** to view pending orders from outpatient clinics and emergency triage.
2. Confirm specimen reception (e.g. whole blood, urine, tissue sample) and barcode identity.
3. Input verified numerical findings, unit, and reference intervals.
4. Mark result status as **Approved & Released**. Released findings become immediately accessible to the ordering clinician and the patient's portal.

---

## 6. Pharmacist Workflows

### 6.1 Dispensing Prescriptions
1. Open the **Pharmacy Dispensary** queue.
2. Search prescription number or patient ID.
3. Verify prescribed drug against active batch inventory (ensures valid expiration date and adequate quantity).
4. Enter quantity dispensed, review contraindications, and click **Dispense & Record**.
5. The system atomically deducts stock from inventory and generates a signed receipt.

---

## 7. Patient Portal Workflows

Patients can access their health records from home or mobile devices:
1. **Self-Service Registration:** Choose **Patient Login**, then click **Create a patient account** on the sign-in page. Enter personal details and create a password.
2. **Dashboard Overview:** Displays upcoming appointments, active prescriptions, and recent lab results.
3. **Appointment Scheduling:** Select specialty clinic, choose an available date and time, and submit request.
4. **Accessing Medical Records:** View finalized diagnoses and verified laboratory reports with normal reference ranges.
5. **Billing & Invoices:** View outstanding charges, line-item breakdowns, and settled payments.

---

## 8. Security Best Practices for Staff
- **Lock Screens:** Always lock your terminal (`Windows Key + L`) when stepping away from consultation desks or nurse stations.
- **Session Expiration:** For security, sessions automatically expire after 15 minutes of inactivity.
- **Confidentiality:** Patient health information (PHI) must never be photographed, shared via messaging apps, or discussed in public corridors.
