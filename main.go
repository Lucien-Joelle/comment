package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
)

// Comment 定义评论的数据结构
type Comment struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

// 模拟的数据库
var (
	mutex       = &sync.RWMutex{}
	comments    = make([]Comment, 0)
	incrementID = 0
)

// Response 统一的API响应结构
type Response struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

// GetCommentsResponse 获取评论列表的特定响应数据结构
type GetCommentsResponse struct {
	Total    int       `json:"total"`
	Comments []Comment `json:"comments"`
}

func main() {
	// 初始化数据
	comments = append(comments, Comment{ID: 1, Name: "User1", Content: "This is the first comment!"})
	comments = append(comments, Comment{ID: 2, Name: "User2", Content: "Hello World!"})
	comments = append(comments, Comment{ID: 2, Name: "User2", Content: "我想放假www"})
	incrementID = 3

	http.HandleFunc("/comment/get", getCommentsHandler)
	http.HandleFunc("/comment/add", addCommentHandler)
	http.HandleFunc("/comment/delete", deleteCommentHandler)

	fmt.Println("Server is running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func getCommentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// 支持CORS，允许前端从不同源访问
	w.Header().Set("Access-Control-Allow-Origin", "*")

	pageStr := r.URL.Query().Get("page")
	sizeStr := r.URL.Query().Get("size")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	size, err := strconv.Atoi(sizeStr)
	if err != nil || size <= 0 {
		size = 10
	}

	mutex.RLock()
	defer mutex.RUnlock()

	total := len(comments)
	start := (page - 1) * size
	if start > total {
		start = total
	}
	end := start + size
	if end > total {
		end = total
	}

	var pagedComments []Comment
	if start <= end {
		pagedComments = comments[start:end]
	} else {
		pagedComments = []Comment{}
	}

	resp := Response{
		Code: 0,
		Msg:  "success",
		Data: GetCommentsResponse{
			Total:    total,
			Comments: pagedComments,
		},
	}
	json.NewEncoder(w).Encode(resp)
}

func addCommentHandler(w http.ResponseWriter, r *http.Request) {
	// 允许CORS预检请求
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	var newComment struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&newComment); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	incrementID++
	commentToAdd := Comment{
		ID:      incrementID,
		Name:    newComment.Name,
		Content: newComment.Content,
	}
	comments = append(comments, commentToAdd)

	resp := Response{
		Code: 0,
		Msg:  "success",
		Data: commentToAdd,
	}
	json.NewEncoder(w).Encode(resp)
}

func deleteCommentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-control-allow-headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid comment ID", http.StatusBadRequest)
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	found := false
	var indexToDelete = -1
	for i, c := range comments {
		if c.ID == id {
			found = true
			indexToDelete = i
			break
		}
	}

	if found {
		comments = append(comments[:indexToDelete], comments[indexToDelete+1:]...)
		resp := Response{Code: 0, Msg: "success", Data: nil}
		json.NewEncoder(w).Encode(resp)
	} else {
		resp := Response{Code: 1, Msg: "Comment not found", Data: nil}
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(resp)
	}
}
