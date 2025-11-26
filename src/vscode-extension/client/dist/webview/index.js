"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const WorkflowGraphViewer_1 = require("./WorkflowGraphViewer");
require("@xyflow/react/dist/style.css");
const root = (0, client_1.createRoot)(document.getElementById('root'));
root.render(<WorkflowGraphViewer_1.WorkflowGraphViewer />);
//# sourceMappingURL=index.js.map