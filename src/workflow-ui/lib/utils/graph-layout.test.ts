import { describe, it, expect } from 'vitest';
import { layoutGraph, LayoutDirection } from './graph-layout';
import type { Node, Edge } from 'reactflow';

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
    it('respects custom node spacing', () => {
      const nodes: Node[] = [
        { id: 'task1', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
        { id: 'task2', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
      ];
      const edges: Edge[] = [{ id: 'e1-2', source: 'task1', target: 'task2' }];

      const layoutedDefault = layoutGraph(nodes, edges);
      const layoutedCustom = layoutGraph(nodes, edges, { nodeSpacing: 200 });

      const spacingDefault = Math.abs(layoutedDefault[1].position.y - layoutedDefault[0].position.y);
      const spacingCustom = Math.abs(layoutedCustom[1].position.y - layoutedCustom[0].position.y);

      expect(spacingCustom).toBeGreaterThan(spacingDefault);
    });
  });
});
