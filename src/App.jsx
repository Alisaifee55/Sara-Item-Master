import React, { useCallback, useEffect, useRef, useState } from 'react';

import Header from './components/Header.jsx';
import DragOverlay from './components/DragOverlay.jsx';
import UploadScreen from './components/UploadScreen.jsx';
import ProcessingScreen from './components/ProcessingScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import ErrorScreen from './components/ErrorScreen.jsx';

import { fetchMasterData } from './lib/masterApi.js';
import { readWorkbook, applyChangesAndExport, buildOutputFilename, downloadBlob, UnreadableWorkbookError } from './lib/excel.js';
import { runValidation, buildHeaderIndex, findMissingHeaders } from './lib/validate.js';
import { STEP_SCRIPT } from './lib/constants.js';

const ACCEPT = '.xlsx,.xls';

export default function App() {
  const [screen, setScreen] = useState('upload'); // upload | processing | done | error
  const [errorKind, setErrorKind] = useState(null); // badFile | missingHeaders
  const [missingHeaders, setMissingHeaders] = useState([]);
  const [masterOffline, setMasterOffline] = useState(false);
  const [masterStatusText, setMasterStatusText] = useState('Master live · read on load');
  const [master, setMaster] = useState(null); // { masters, codes }
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const [stepIndex, setStepIndex] = useState(0);
  const [liveCounts, setLiveCounts] = useState({ notMaster: 0, caseMismatch: 0, space: 0, formula: 0 });
  const [rowsSeen, setRowsSeen] = useState(0);

  const [result, setResult] = useState(null); // { changes, counts, byColumn, rows, headerIndex }
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputFilename, setOutputFilename] = useState('');
  const [filter, setFilter] = useState(null);

  const dragCounter = useRef(0);
  const stepTimer = useRef(null);

  // --- master data fetch (on load + Refresh master) ---
  const loadMaster = useCallback(async () => {
    try {
      const data = await fetchMasterData();
      setMaster(data);
      setMasterOffline(false);
      setMasterStatusText('Master refreshed just now');
    } catch (err) {
      setMasterOffline(true);
      setMasterStatusText('Master unreachable');
    }
  }, []);

  useEffect(() => {
    loadMaster();
  }, [loadMaster]);

  // --- global drag & drop (whole page is the drop target on Upload) ---
  useEffect(() => {
    if (screen !== 'upload') return;

    const onDragOver = (e) => {
      e.preventDefault();
    };
    const onDragEnter = (e) => {
      e.preventDefault();
      dragCounter.current += 1;
      setDragging(true);
    };
    const onDragLeave = (e) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setDragging(false);
      }
    };
    const onDrop = (e) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, master, masterOffline]);

  function resetToUpload() {
    setScreen('upload');
    setErrorKind(null);
    setMissingHeaders([]);
    setFileName('');
    setResult(null);
    setOutputBlob(null);
    setFilter(null);
    setStepIndex(0);
    setLiveCounts({ notMaster: 0, caseMismatch: 0, space: 0, formula: 0 });
    if (stepTimer.current) clearTimeout(stepTimer.current);
  }

  async function handleFile(file) {
    if (masterOffline || !master) {
      // Validation must not run against a stale/partial master.
      return;
    }
    setFileName(file.name);
    setScreen('processing');
    setStepIndex(0);
    setLiveCounts({ notMaster: 0, caseMismatch: 0, space: 0, formula: 0 });

    let parsed;
    try {
      parsed = await readWorkbook(file);
    } catch (err) {
      setErrorKind('badFile');
      setScreen('error');
      return;
    }

    const headerIndex = buildHeaderIndex(parsed.rows[0] || []);
    const missing = findMissingHeaders(headerIndex, master.masters);
    if (missing.length > 0) {
      setMissingHeaders(missing);
      setErrorKind('missingHeaders');
      setScreen('error');
      return;
    }

    setRowsSeen(parsed.rows.length - 1);

    // Run the real validation pass up front (fast even for large sheets),
    // then walk the pre-scripted step sequence to show legible, staged
    // progress with the true per-step counts rather than a fabricated
    // number. For very large workbooks this loop can be chunked with
    // requestIdleCallback/yield points without changing this contract.
    const validationResult = runValidation(parsed.rows, master.masters, master.codes);

    animateSteps(validationResult, parsed);
  }

  function animateSteps(validationResult, parsed) {
    let i = 0;
    const cumulative = { notMaster: 0, caseMismatch: 0, space: 0, formula: 0, tooLong: 0 };

    const stepDurations = STEP_SCRIPT.map((s) => (s.id === 'read' || s.id === 'master' ? 550 : 420));

    const advance = () => {
      const step = STEP_SCRIPT[i];
      if (!step) {
        finish(validationResult, parsed);
        return;
      }
      if (step.columns) {
        for (const col of step.columns) {
          const colCounts = validationResult.byColumn[col];
          if (colCounts) {
            cumulative.notMaster += colCounts.notMaster;
            cumulative.caseMismatch += colCounts.caseMismatch;
            cumulative.space += colCounts.space;
          }
        }
      }
      if (step.id === 'barcode' || step.id === 'itemname') {
        const col = step.id === 'barcode' ? 'BARCODE' : 'ITEMNAME';
        const colCounts = validationResult.byColumn[col];
        if (colCounts) cumulative.formula += colCounts.formula;
      }
      if (step.id === 'toolong') {
        const colCounts = validationResult.byColumn.BARCODE;
        if (colCounts) cumulative.tooLong += colCounts.tooLong;
      }
      setStepIndex(i);
      setLiveCounts({ ...cumulative });
      i += 1;
      stepTimer.current = setTimeout(advance, stepDurations[i - 1] || 420);
    };
    advance();
  }

  async function finish(validationResult, parsed) {
    const blob = await applyChangesAndExport(
      parsed.workbook,
      parsed.worksheet,
      validationResult.edits,
      validationResult.changes,
      validationResult.headerIndex,
      master.masters,
      master.codes,
      parsed.rows.length - 1
    );
    const filename = buildOutputFilename();
    setResult({ ...validationResult, totalRows: parsed.rows.length - 1 });
    setOutputBlob(blob);
    setOutputFilename(filename);
    downloadBlob(blob, filename); // auto-download, no click required
    setScreen('done');
  }

  function handleDownloadAgain() {
    if (outputBlob) downloadBlob(outputBlob, outputFilename);
  }

  function toggleFilter(kind) {
    setFilter((prev) => (prev === kind ? null : kind));
  }

  return (
    <div>
      <Header
        masterOffline={masterOffline}
        statusText={masterStatusText}
        onRefresh={loadMaster}
      />

      {screen === 'upload' && (
        <UploadScreen accept={ACCEPT} onFile={handleFile} masterOffline={masterOffline} />
      )}

      {screen === 'processing' && (
        <ProcessingScreen
          stepIndex={stepIndex}
          steps={STEP_SCRIPT}
          liveCounts={liveCounts}
          rowsSeen={rowsSeen}
          fileName={fileName}
        />
      )}

      {screen === 'done' && result && (
        <ResultScreen
          result={result}
          filename={outputFilename}
          filter={filter}
          onToggleFilter={toggleFilter}
          onValidateAnother={resetToUpload}
          onDownloadAgain={handleDownloadAgain}
        />
      )}

      {screen === 'error' && (
        <ErrorScreen
          kind={errorKind}
          missingHeaders={missingHeaders}
          onChooseAnother={handleFile}
          onBack={resetToUpload}
        />
      )}

      {screen === 'upload' && <DragOverlay visible={dragging} />}
    </div>
  );
}
