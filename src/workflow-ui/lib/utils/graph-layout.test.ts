import { describe, it, expect } from 'vitest';
import { layoutGraph, identifyParallelGroups } from './graph-layout';
import type { Node, Edge } from '@xyflow/react';

describe('layoutGraph', () => {
  describe('Linear Graph Layout', () => {
    it('layouts simple linear graph correctly', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
      ];
      const edges: Edge[] = [{ id: 'e1-2', source: 'task1', target: 'task2' }];

      const layouted = layoutGraph(nodes, edges);

      expect(layouted[0].position.x).toBeDefined();
      expect(layouted[0].position.y).toBeDefined();
      expect(layouted[1].position.y).toBeGreaterThan(layouted[0].position.y); // task2 below task1
    });

    it('layouts three-task linear chain', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
        { id: 'task3', position: { x: 0, y: 0 }, data: { label: 'Task 3' } },
      ];
      const edges: Edge[] = [
        { id: 'e1-2', source: 'task1', target: 'task2' },
        { id: 'e2-3', source: 'task2', target: 'task3' },
      ];

      const layouted = layoutGraph(nodes, edges);

      expect(layouted[0].position.y).toBeLessThan(layouted[1].position.y);
      expect(layouted[1].position.y).toBeLessThan(layouted[2].position.y);
    });
  });

  describe('Parallel Graph Layout', () => {
    it('layouts parallel tasks at same level', () => {
      const nodes: Node[] = [
        { id: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'parallel1', position: { x: 0, y: 0 }, data: { label: 'Parallel 1' } },
        { id: 'parallel2', position: { x: 0, y: 0 }, data: { label: 'Parallel 2' } },
        { id: 'end', position: { x: 0, y: 0 }, data: { label: 'End' } },
      ];
      const edges: Edge[] = [
        { id: 'e-s-p1', source: 'start', target: 'parallel1' },
        { id: 'e-s-p2', source: 'start', target: 'parallel2' },
        { id: 'e-p1-e', source: 'parallel1', target: 'end' },
        { id: 'e-p2-e', source: 'parallel2', target: 'end' },
      ];

      const layouted = layoutGraph(nodes, edges);

      const parallel1 = layouted.find((n) => n.id === 'parallel1')!;
      const parallel2 = layouted.find((n) => n.id === 'parallel2')!;

      // Parallel tasks should be at similar y position (same level)
      expect(Math.abs(parallel1.position.y - parallel2.position.y)).toBeLessThan(10);
      // But different x positions
      expect(parallel1.position.x).not.toBe(parallel2.position.x);
    });
  });

  describe('Complex Graph Layout', () => {
    it('layouts diamond-shaped graph', () => {
      const nodes: Node[] = [
        { id: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'branch1', position: { x: 0, y: 0 }, data: { label: 'Branch 1' } },
        { id: 'branch2', position: { x: 0, y: 0 }, data: { label: 'Branch 2' } },
        { id: 'merge', position: { x: 0, y: 0 }, data: { label: 'Merge' } },
      ];
      const edges: Edge[] = [
        { id: 'e-s-b1', source: 'start', target: 'branch1' },
        { id: 'e-s-b2', source: 'start', target: 'branch2' },
        { id: 'e-b1-m', source: 'branch1', target: 'merge' },
        { id: 'e-b2-m', source: 'branch2', target: 'merge' },
      ];

      const layouted = layoutGraph(nodes, edges);

      const start = layouted.find((n) => n.id === 'start')!;
      const merge = layouted.find((n) => n.id === 'merge')!;
      const branch1 = layouted.find((n) => n.id === 'branch1')!;
      const branch2 = layouted.find((n) => n.id === 'branch2')!;

      // Start should be at top
      expect(start.position.y).toBeLessThan(branch1.position.y);
      expect(start.position.y).toBeLessThan(branch2.position.y);

      // Merge should be at bottom
      expect(merge.position.y).toBeGreaterThan(branch1.position.y);
      expect(merge.position.y).toBeGreaterThan(branch2.position.y);

      // Branches should be at same level
      expect(Math.abs(branch1.position.y - branch2.position.y)).toBeLessThan(10);
    });
  });

  describe('Horizontal Layout', () => {
    it('layouts graph horizontally when direction is LR', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
      ];
      const edges: Edge[] = [{ id: 'e1-2', source: 'task1', target: 'task2' }];

      const layouted = layoutGraph(nodes, edges, { direction: 'LR' });

      // In LR layout, task2 should be to the right of task1
      expect(layouted[1].position.x).toBeGreaterThan(layouted[0].position.x);
    });
  });

  describe('Edge Cases', () => {
    it('handles single node', () => {
      const nodes: Node[] = [{ id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } }];
      const edges: Edge[] = [];

      const layouted = layoutGraph(nodes, edges);

      expect(layouted).toHaveLength(1);
      expect(layouted[0].position.x).toBeDefined();
      expect(layouted[0].position.y).toBeDefined();
    });

    it('handles empty graph', () => {
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const layouted = layoutGraph(nodes, edges);

      expect(layouted).toHaveLength(0);
    });

    it('preserves node data', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1', custom: 'value' } },
      ];
      const edges: Edge[] = [];

      const layouted = layoutGraph(nodes, edges);

      expect(layouted[0].data).toEqual({ label: 'Task 1', custom: 'value' });
    });

    it('handles disconnected components', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
        { id: 'task3', position: { x: 0, y: 0 }, data: { label: 'Task 3' } },
      ];
      const edges: Edge[] = [{ id: 'e1-2', source: 'task1', target: 'task2' }];

      const layouted = layoutGraph(nodes, edges);

      expect(layouted).toHaveLength(3);
      // All nodes should have valid positions
      layouted.forEach((node) => {
        expect(node.position.x).toBeDefined();
        expect(node.position.y).toBeDefined();
      });
    });
  });

  describe('Custom Spacing', () => {
    it('respects custom rank spacing (vertical)', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
      ];
      const edges: Edge[] = [{ id: 'e1-2', source: 'task1', target: 'task2' }];

      const layoutedDefault = layoutGraph(nodes, edges);
      const layoutedCustom = layoutGraph(nodes, edges, { rankSpacing: 250 });

      const spacingDefault = Math.abs(
        layoutedDefault[1].position.y - layoutedDefault[0].position.y
      );
      const spacingCustom = Math.abs(layoutedCustom[1].position.y - layoutedCustom[0].position.y);

      expect(spacingCustom).toBeGreaterThan(spacingDefault);
    });
  });
});

describe('identifyParallelGroups', () => {
  describe('Empty and Single Node Cases', () => {
    it('returns empty array for empty graph', () => {
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toEqual([]);
    });

    it('returns single group for single node', () => {
      const nodes: Node[] = [{ id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } }];
      const edges: Edge[] = [];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toEqual({ level: 0, taskIds: ['task1'] });
    });
  });

  describe('Linear Workflow (No Parallelism)', () => {
    it('assigns different levels to sequential tasks', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
        { id: 'task3', position: { x: 0, y: 0 }, data: { label: 'Task 3' } },
      ];
      const edges: Edge[] = [
        { id: 'e1-2', source: 'task1', target: 'task2' },
        { id: 'e2-3', source: 'task2', target: 'task3' },
      ];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(3); // 3 levels, 1 task each
      expect(groups[0]).toEqual({ level: 0, taskIds: ['task1'] });
      expect(groups[1]).toEqual({ level: 1, taskIds: ['task2'] });
      expect(groups[2]).toEqual({ level: 2, taskIds: ['task3'] });
    });
  });

  describe('Parallel Tasks (Fork-Join Pattern)', () => {
    it('identifies tasks that can run in parallel', () => {
      const nodes: Node[] = [
        { id: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'parallel1', position: { x: 0, y: 0 }, data: { label: 'Parallel 1' } },
        { id: 'parallel2', position: { x: 0, y: 0 }, data: { label: 'Parallel 2' } },
        { id: 'end', position: { x: 0, y: 0 }, data: { label: 'End' } },
      ];
      const edges: Edge[] = [
        { id: 'e-s-p1', source: 'start', target: 'parallel1' },
        { id: 'e-s-p2', source: 'start', target: 'parallel2' },
        { id: 'e-p1-e', source: 'parallel1', target: 'end' },
        { id: 'e-p2-e', source: 'parallel2', target: 'end' },
      ];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(3);
      expect(groups[0]).toEqual({ level: 0, taskIds: ['start'] });
      // parallel1 and parallel2 should be at the same level
      expect(groups[1].level).toBe(1);
      expect(groups[1].taskIds).toHaveLength(2);
      expect(groups[1].taskIds).toContain('parallel1');
      expect(groups[1].taskIds).toContain('parallel2');
      expect(groups[2]).toEqual({ level: 2, taskIds: ['end'] });
    });

    it('identifies three parallel tasks', () => {
      const nodes: Node[] = [
        { id: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'p1', position: { x: 0, y: 0 }, data: { label: 'P1' } },
        { id: 'p2', position: { x: 0, y: 0 }, data: { label: 'P2' } },
        { id: 'p3', position: { x: 0, y: 0 }, data: { label: 'P3' } },
        { id: 'end', position: { x: 0, y: 0 }, data: { label: 'End' } },
      ];
      const edges: Edge[] = [
        { id: 'e-s-p1', source: 'start', target: 'p1' },
        { id: 'e-s-p2', source: 'start', target: 'p2' },
        { id: 'e-s-p3', source: 'start', target: 'p3' },
        { id: 'e-p1-e', source: 'p1', target: 'end' },
        { id: 'e-p2-e', source: 'p2', target: 'end' },
        { id: 'e-p3-e', source: 'p3', target: 'end' },
      ];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(3);
      expect(groups[1].level).toBe(1);
      expect(groups[1].taskIds).toHaveLength(3);
      expect(groups[1].taskIds).toContain('p1');
      expect(groups[1].taskIds).toContain('p2');
      expect(groups[1].taskIds).toContain('p3');
    });
  });

  describe('Diamond Pattern (Complex Dependencies)', () => {
    it('correctly handles diamond dependency pattern', () => {
      const nodes: Node[] = [
        { id: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'branch1', position: { x: 0, y: 0 }, data: { label: 'Branch 1' } },
        { id: 'branch2', position: { x: 0, y: 0 }, data: { label: 'Branch 2' } },
        { id: 'merge', position: { x: 0, y: 0 }, data: { label: 'Merge' } },
      ];
      const edges: Edge[] = [
        { id: 'e-s-b1', source: 'start', target: 'branch1' },
        { id: 'e-s-b2', source: 'start', target: 'branch2' },
        { id: 'e-b1-m', source: 'branch1', target: 'merge' },
        { id: 'e-b2-m', source: 'branch2', target: 'merge' },
      ];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(3);
      expect(groups[0]).toEqual({ level: 0, taskIds: ['start'] });

      // Branches at level 1 (parallel)
      expect(groups[1].level).toBe(1);
      expect(groups[1].taskIds).toHaveLength(2);
      expect(groups[1].taskIds).toContain('branch1');
      expect(groups[1].taskIds).toContain('branch2');

      // Merge waits for both branches (level 2)
      expect(groups[2]).toEqual({ level: 2, taskIds: ['merge'] });
    });
  });

  describe('Multi-Level Parallelism', () => {
    it('identifies multiple parallel groups at different levels', () => {
      const nodes: Node[] = [
        { id: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'p1a', position: { x: 0, y: 0 }, data: { label: 'P1A' } },
        { id: 'p1b', position: { x: 0, y: 0 }, data: { label: 'P1B' } },
        { id: 'p2a', position: { x: 0, y: 0 }, data: { label: 'P2A' } },
        { id: 'p2b', position: { x: 0, y: 0 }, data: { label: 'P2B' } },
        { id: 'end', position: { x: 0, y: 0 }, data: { label: 'End' } },
      ];
      const edges: Edge[] = [
        // Level 0 → Level 1
        { id: 'e-s-p1a', source: 'start', target: 'p1a' },
        { id: 'e-s-p1b', source: 'start', target: 'p1b' },
        // Level 1 → Level 2
        { id: 'e-p1a-p2a', source: 'p1a', target: 'p2a' },
        { id: 'e-p1b-p2b', source: 'p1b', target: 'p2b' },
        // Level 2 → Level 3
        { id: 'e-p2a-end', source: 'p2a', target: 'end' },
        { id: 'e-p2b-end', source: 'p2b', target: 'end' },
      ];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(4);
      expect(groups[0]).toEqual({ level: 0, taskIds: ['start'] });

      // First parallel group
      expect(groups[1].level).toBe(1);
      expect(groups[1].taskIds).toHaveLength(2);
      expect(groups[1].taskIds).toContain('p1a');
      expect(groups[1].taskIds).toContain('p1b');

      // Second parallel group
      expect(groups[2].level).toBe(2);
      expect(groups[2].taskIds).toHaveLength(2);
      expect(groups[2].taskIds).toContain('p2a');
      expect(groups[2].taskIds).toContain('p2b');

      expect(groups[3]).toEqual({ level: 3, taskIds: ['end'] });
    });
  });

  describe('Disconnected Components', () => {
    it('handles disconnected tasks (no edges connecting them)', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
        { id: 'task3', position: { x: 0, y: 0 }, data: { label: 'Task 3' } },
      ];
      // task2 and task3 connected, but task1 disconnected
      const edges: Edge[] = [{ id: 'e2-3', source: 'task2', target: 'task3' }];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(2);

      // Level 0: both task1 (disconnected) and task2 (root of connected component)
      expect(groups[0].level).toBe(0);
      expect(groups[0].taskIds).toHaveLength(2);
      expect(groups[0].taskIds).toContain('task1');
      expect(groups[0].taskIds).toContain('task2');

      // Level 1: task3 (depends on task2)
      expect(groups[1]).toEqual({ level: 1, taskIds: ['task3'] });
    });

    it('handles fully disconnected graph', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
        { id: 'task3', position: { x: 0, y: 0 }, data: { label: 'Task 3' } },
      ];
      const edges: Edge[] = []; // No edges

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(1);
      expect(groups[0].level).toBe(0);
      expect(groups[0].taskIds).toHaveLength(3);
      expect(groups[0].taskIds).toContain('task1');
      expect(groups[0].taskIds).toContain('task2');
      expect(groups[0].taskIds).toContain('task3');
    });
  });

  describe('Complex Workflow Patterns', () => {
    it('handles complex mixed sequential and parallel workflow', () => {
      const nodes: Node[] = [
        { id: 'init', position: { x: 0, y: 0 }, data: { label: 'Init' } },
        { id: 'fetch1', position: { x: 0, y: 0 }, data: { label: 'Fetch 1' } },
        { id: 'fetch2', position: { x: 0, y: 0 }, data: { label: 'Fetch 2' } },
        { id: 'process', position: { x: 0, y: 0 }, data: { label: 'Process' } },
        { id: 'save1', position: { x: 0, y: 0 }, data: { label: 'Save 1' } },
        { id: 'save2', position: { x: 0, y: 0 }, data: { label: 'Save 2' } },
        { id: 'notify', position: { x: 0, y: 0 }, data: { label: 'Notify' } },
      ];
      const edges: Edge[] = [
        { id: 'e-init-f1', source: 'init', target: 'fetch1' },
        { id: 'e-init-f2', source: 'init', target: 'fetch2' },
        { id: 'e-f1-proc', source: 'fetch1', target: 'process' },
        { id: 'e-f2-proc', source: 'fetch2', target: 'process' },
        { id: 'e-proc-s1', source: 'process', target: 'save1' },
        { id: 'e-proc-s2', source: 'process', target: 'save2' },
        { id: 'e-s1-notify', source: 'save1', target: 'notify' },
        { id: 'e-s2-notify', source: 'save2', target: 'notify' },
      ];

      const groups = identifyParallelGroups(nodes, edges);

      expect(groups).toHaveLength(5);

      // Level 0: init
      expect(groups[0]).toEqual({ level: 0, taskIds: ['init'] });

      // Level 1: fetch1, fetch2 (parallel)
      expect(groups[1].level).toBe(1);
      expect(groups[1].taskIds).toHaveLength(2);

      // Level 2: process (waits for both fetches)
      expect(groups[2]).toEqual({ level: 2, taskIds: ['process'] });

      // Level 3: save1, save2 (parallel)
      expect(groups[3].level).toBe(3);
      expect(groups[3].taskIds).toHaveLength(2);

      // Level 4: notify (waits for both saves)
      expect(groups[4]).toEqual({ level: 4, taskIds: ['notify'] });
    });
  });
});
