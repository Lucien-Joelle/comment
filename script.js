$(document).ready(function() {
    // 定义常量和变量
    var API_HOST = 'http://localhost:8080';
    var PAGE_SIZE = 3;
    var currentPage = 1;
    var totalComments = 0;

    // 渲染评论列表的函数
    function renderComments(comments) {
        var commentList = $('.comment-list');
        commentList.empty(); // 清空现有列表

        // 如果没有评论，显示提示信息
        if (!comments || comments.length === 0) {
            commentList.append('<li class="no-comment">暂无评论</li>');
            totalComments = 0; 
            updatePaginationButtons();
            return;
        }

        // 遍历每个评论并创建HTML
        for (var i = 0; i < comments.length; i++) {
            var comment = comments[i];
            var commentHTML = '<li class="comment-item" data-id="' + comment.id + '">';
            commentHTML += '<div class="comment-content">';
            commentHTML += '<span class="user-name">' + escapeHtml(comment.name) + '</span>';
            commentHTML += '<p>' + escapeHtml(comment.content) + '</p>';
            commentHTML += '</div>';
            commentHTML += '<button class="delete-button">删除</button>';
            commentHTML += '</li>';
            
            commentList.append(commentHTML);
        }
        
        // 给第一条评论添加特殊样式
        $('.comment-item:first-child').css('border-left-color', 'red');
        updatePaginationButtons();
    }

    // 更新分页按钮状态的函数
    function updatePaginationButtons() {
        // 如果是第一页，禁用"上一页"按钮
        if (currentPage === 1) {
            $('#prev-page').prop('disabled', true);
        } else {
            $('#prev-page').prop('disabled', false);
        }
        
        // 计算最大页数
        var maxPage = Math.ceil(totalComments / PAGE_SIZE);
        // 如果是最后一页，禁用"下一页"按钮
        if (currentPage >= maxPage || maxPage <= 1) {
            $('#next-page').prop('disabled', true);
        } else {
            $('#next-page').prop('disabled', false);
        }
    }

    // 从服务器获取评论的函数
    function fetchComments() {
        var url = API_HOST + '/comment/get?page=' + currentPage + '&size=' + PAGE_SIZE;
        
        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.code === 0 && response.data) {
                    totalComments = response.data.total;
                    renderComments(response.data.comments);
                } else {
                    console.log('获取评论失败:', response.msg);
                    renderComments([]);
                }
            },
            error: function() {
                console.log('网络错误，无法获取评论');
                renderComments([]);
            }
        });
    }

    // 提交按钮点击事件
    $('.submit-button').on('click', function() {
        var nameInput = $('.name-input');
        var contentInput = $('.content-input');
        var name = nameInput.val();
        var content = contentInput.val();
        
        // 去除首尾空格
        name = name.trim();
        content = content.trim();

        // 检查输入是否为空
        if (name === '' || content === '') {
            alert('用户名和评论内容不能为空！');
            return;
        }
        
        // 禁用提交按钮，防止重复提交
        $(this).prop('disabled', true);
        
        // 准备要发送的数据
        var postData = {
            name: name,
            content: content
        };
        
        $.ajax({
            url: API_HOST + '/comment/add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(postData),
            success: function(response) {
                if (response.code === 0) {
                    // 清空输入框
                    nameInput.val('');
                    contentInput.val('');
                    // 回到第一页
                    currentPage = 1;
                    // 重新获取评论
                    fetchComments();
                } else {
                    alert('添加评论失败: ' + response.msg);
                }
            },
            error: function() {
                alert('网络错误，无法添加评论');
            },
            complete: function() {
                // 恢复提交按钮
                $('.submit-button').prop('disabled', false);
            }
        });
    });

    // 删除按钮点击事件（使用事件委托）
    $('.comment-list').on('click', '.delete-button', function() {
        var commentItem = $(this).closest('.comment-item');
        var commentId = commentItem.data('id');

        // 确认删除
        var confirmDelete = confirm('确定要删除这条评论吗？');
        if (confirmDelete) {
            var deleteUrl = API_HOST + '/comment/delete?id=' + commentId;
            
            $.ajax({
                url: deleteUrl,
                method: 'POST',
                success: function(response) {
                    if (response.code === 0) {
                        // 如果当前页只有一条评论且不是第一页，回到上一页
                        if ($('.comment-item').length === 1 && currentPage > 1) {
                            currentPage = currentPage - 1;
                        }
                        fetchComments();
                    } else {
                        alert('删除评论失败: ' + response.msg);
                    }
                },
                error: function() {
                    alert('网络错误，无法删除评论');
                }
            });
        }
    });

    // 上一页按钮点击事件
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            currentPage = currentPage - 1;
            fetchComments();
        }
    });

    // 下一页按钮点击事件
    $('#next-page').on('click', function() {
        var maxPage = Math.ceil(totalComments / PAGE_SIZE);
        if (currentPage < maxPage) {
            currentPage = currentPage + 1;
            fetchComments();
        }
    });

    // 转义HTML字符的函数，防止XSS攻击
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 页面加载时获取评论
    fetchComments();

    // 每隔30秒自动刷新评论
    setInterval(fetchComments, 30000);
});