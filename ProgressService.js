/**
 * Facility Repair System (FRS)
 * ProgressService.gs
 * Version 2.3.03
 *
 * แปลง Workflow จริงของ FRS เป็น UX Progress โดยไม่เพิ่มคอลัมน์ใน REQUESTS
 */

const ProgressService = Object.freeze({
  STEPS: Object.freeze([
    Object.freeze({ key: 'REQUESTED', label: 'แจ้งซ่อม', shortLabel: 'แจ้งซ่อม' }),
    Object.freeze({ key: 'RECEIVED', label: 'รับเรื่อง', shortLabel: 'รับเรื่อง' }),
    Object.freeze({ key: 'ASSIGNED', label: 'มอบหมายช่าง', shortLabel: 'มอบหมาย' }),
    Object.freeze({ key: 'WORKING', label: 'กำลังดำเนินการ', shortLabel: 'ดำเนินการ' }),
    Object.freeze({ key: 'CLOSED', label: 'ปิดงาน', shortLabel: 'ปิดงาน' })
  ]),

  STATUS_META: Object.freeze({
    NEW: Object.freeze({ percent: 10, step: 1, tone: 'new', label: 'แจ้งซ่อมแล้ว' }),
    RECEIVED: Object.freeze({ percent: 25, step: 2, tone: 'received', label: 'รับเรื่องแล้ว' }),
    ASSIGNED: Object.freeze({ percent: 40, step: 3, tone: 'assigned', label: 'มอบหมายช่างแล้ว' }),
    IN_PROGRESS: Object.freeze({ percent: 70, step: 4, tone: 'working', label: 'กำลังดำเนินการ' }),
    WAITING_PART: Object.freeze({ percent: 65, step: 4, tone: 'waiting', label: 'รออะไหล่/รอจัดซื้อ' }),
    OUTSOURCE: Object.freeze({ percent: 65, step: 4, tone: 'outsource', label: 'ส่งซ่อมภายนอก' }),
    DONE: Object.freeze({ percent: 90, step: 4, tone: 'done', label: 'ดำเนินการเสร็จ รอตรวจสอบ' }),
    CLOSED: Object.freeze({ percent: 100, step: 5, tone: 'closed', label: 'ปิดงานแล้ว' }),
    CANCELLED: Object.freeze({ percent: 0, step: 0, tone: 'cancelled', label: 'ยกเลิกงาน' })
  }),

  build(request) {
    const row = request || {};
    const status = String(row.STATUS_CODE || APP_CONFIG.STATUS.NEW).trim().toUpperCase();
    const meta = this.STATUS_META[status] || this.STATUS_META.NEW;
    const currentStep = Number(meta.step || 1);
    const isCancelled = status === APP_CONFIG.STATUS.CANCELLED;

    const steps = this.STEPS.map(function(step, index) {
      const stepNo = index + 1;
      let state = 'pending';
      if (isCancelled) {
        state = stepNo === 1 ? 'cancelled' : 'pending';
      } else if (stepNo < currentStep) {
        state = 'completed';
      } else if (stepNo === currentStep) {
        state = status === APP_CONFIG.STATUS.CLOSED ? 'completed' : 'active';
      }
      return {
        number: stepNo,
        key: step.key,
        label: step.label,
        shortLabel: step.shortLabel,
        state: state
      };
    });

    return {
      statusCode: status,
      statusName: row.STATUS_NAME_TH || meta.label,
      percent: Number(meta.percent),
      step: currentStep,
      totalSteps: this.STEPS.length,
      tone: meta.tone,
      label: meta.label,
      isCancelled: isCancelled,
      steps: steps,
      subProgress: this.buildSubProgress_(row, status)
    };
  },

  buildSubProgress_(row, status) {
    const initial = [APP_CONFIG.STATUS.NEW].indexOf(status) === -1 ? 100 : 35;
    let repair = 0;
    let testing = 0;

    if (status === APP_CONFIG.STATUS.ASSIGNED) repair = 15;
    if (status === APP_CONFIG.STATUS.IN_PROGRESS) repair = 65;
    if ([APP_CONFIG.STATUS.WAITING_PART, APP_CONFIG.STATUS.OUTSOURCE].indexOf(status) !== -1) repair = 55;
    if (status === APP_CONFIG.STATUS.DONE) { repair = 100; testing = 60; }
    if (status === APP_CONFIG.STATUS.CLOSED) { repair = 100; testing = 100; }
    if (status === APP_CONFIG.STATUS.CANCELLED) { repair = 0; testing = 0; }

    return [
      { key: 'INITIAL', label: 'ตรวจสอบเบื้องต้น', percent: initial },
      { key: 'REPAIR', label: 'ดำเนินการซ่อม', percent: repair },
      { key: 'TEST', label: 'ตรวจสอบและทดสอบ', percent: testing }
    ];
  },

  enrich(request) {
    const copy = Object.assign({}, request || {});
    copy.PROGRESS = this.build(copy);
    copy.PROGRESS_PERCENT = copy.PROGRESS.percent;
    copy.PROGRESS_STEP = copy.PROGRESS.step;
    return copy;
  }
});
