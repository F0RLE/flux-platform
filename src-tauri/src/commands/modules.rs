use crate::models::{ControlRequest, ControlResponse};
use crate::services::module_controller::{self, ModuleAction};
use tauri::AppHandle;
use crate::errors::AppError;

#[tauri::command]
pub async fn get_modules() -> Result<Vec<String>, AppError> {
    Ok(vec![]) // Placeholder
}

#[tauri::command]
pub async fn control_module(
    app: AppHandle,
    request: ControlRequest,
) -> Result<ControlResponse, AppError> {
    let module_id = request.module_id.as_ref().ok_or_else(|| AppError::Validation("module_id is required".to_string()))?;

    let action: ModuleAction = request.action.parse()?;

    module_controller::control(app, &module_id, action).await
}
