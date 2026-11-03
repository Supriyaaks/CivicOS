import { Request, Response, NextFunction } from 'express';
import { departmentService } from '../services/department.service';
import { CreateDepartmentSchema, UpdateDepartmentSchema, uuidSchema } from '../types/department.types';

export class DepartmentController {
  async getPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const performance = await departmentService.getPerformance();
      res.json({ success: true, data: performance });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const department = await departmentService.createDepartment(req.body);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const departments = await departmentService.getAllDepartments();
      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      uuidSchema.parse(id);
      const department = await departmentService.getDepartmentById(id);
      res.json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      uuidSchema.parse(id);
      const department = await departmentService.updateDepartment(id, req.body);
      res.json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      uuidSchema.parse(id);
      await departmentService.deleteDepartment(id);
      res.json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const departmentController = new DepartmentController();
