package models

type UpdateUserProfileRequest struct {
	Username        string  `json:"username" binding:"required,min=3,max=50,alphanum"`
	ProfileImageURL *string `json:"profile_image_url"`
}

type UpdateUserProfileResponse struct {
	User UserInfo `json:"user"`
}
