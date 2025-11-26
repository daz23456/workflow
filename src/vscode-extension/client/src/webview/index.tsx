import React from 'react';
import { createRoot } from 'react-dom/client';
import { WorkflowGraphViewer } from './WorkflowGraphViewer';
import '@xyflow/react/dist/style.css';

const root = createRoot(document.getElementById('root')!);
root.render(<WorkflowGraphViewer />);
