import { Response } from "express";
import { ResponseHelper } from "../../utils/responseHelper";

describe("ResponseHelper", () => {
  const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it("success deve retornar 200 com dados", () => {
    const res = mockRes();
    ResponseHelper.success(res, { id: 1 }, "ok");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 }, message: "ok" });
  });

  it("created deve retornar 201", () => {
    const res = mockRes();
    ResponseHelper.created(res, { id: 1 }, "criado");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("badRequest deve retornar 400", () => {
    const res = mockRes();
    ResponseHelper.badRequest(res, "erro");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "erro" });
  });

  it("unauthorized deve retornar 401", () => {
    const res = mockRes();
    ResponseHelper.unauthorized(res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("forbidden deve retornar 403", () => {
    const res = mockRes();
    ResponseHelper.forbidden(res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("notFound deve retornar 404", () => {
    const res = mockRes();
    ResponseHelper.notFound(res, "não achei");
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("conflict deve retornar 409", () => {
    const res = mockRes();
    ResponseHelper.conflict(res, "duplicado");
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("internalError deve retornar 500", () => {
    const res = mockRes();
    ResponseHelper.internalError(res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
