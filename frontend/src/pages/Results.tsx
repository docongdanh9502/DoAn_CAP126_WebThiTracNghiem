import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert, Stack, Chip, TextField, TablePagination, Autocomplete, Button } from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { quizAPI, quizResultAPI } from '../services/api';

const Results: React.FC = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [studentCode, setStudentCode] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [className, setClassName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [minScore, setMinScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [exporting, setExporting] = useState(false);

  const columns = useMemo(() => ([
    { key: 'studentCode', label: 'MSSV' },
    { key: 'fullName', label: 'Họ tên' },
    { key: 'className', label: 'Lớp' },
    { key: 'gender', label: 'Giới tính' },
    { key: 'quizTitle', label: 'Bài thi/Môn' },
    { key: 'score', label: 'Điểm' },
    { key: 'totalQuestions', label: 'Số câu' },
    { key: 'timeSpent', label: 'Thời gian làm bài' },
    { key: 'completedAt', label: 'Nộp lúc' },
  ]), []);

  const formatDuration = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const ss = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const loadForStudent = async () => {
    const res = await quizResultAPI.getStudentQuizResults({ page: page + 1, limit: rowsPerPage, quizId: selectedQuizId || undefined, minScore: minScore ? Number(minScore) : undefined, maxScore: maxScore ? Number(maxScore) : undefined });
    const payload = (res.data.data as any);
    const data = payload.results as any[];
    setTotal(payload.pagination?.total ?? data.length);
    const mapped = data.map((r: any) => ({
      id: r._id,
      studentCode: r.studentCode || (user as any)?.studentId || '',
      fullName: r.fullName || (user as any)?.fullName || (user as any)?.username || '',
      className: r.className || (user as any)?.class || '',
      gender: r.gender || (user as any)?.gender || '',
      quizTitle: r.quizId?.title || '',
      score: r.score != null ? Number(r.score).toFixed(2) : '',
      totalQuestions: r.totalQuestions,
      timeSpent: r.timeSpent,
      completedAt: r.completedAt,
    }));
    setRows(mapped);
    // Build quiz list for student filtering from results
    const unique: any[] = [];
    const seen = new Set();
    (data || []).forEach((r: any) => {
      const q = r.quizId; // populated in backend
      if (q && !seen.has(q._id)) {
        seen.add(q._id);
        unique.push({ _id: q._id, title: q.title });
      }
    });
    if (unique.length) setQuizzes(unique);
  };

  const loadForTeacher = async () => {
    // Load quizzes list (first page only for simplicity)
    if (!quizzes.length) {
      const resQ = await quizAPI.getQuizzes({ page: 1, limit: 50, search: '' });
      const list = (resQ.data.data as any).quizzes || [];
      setQuizzes(list);
      if (!selectedQuizId && list.length) setSelectedQuizId(list[0]._id);
    }
    const qid = selectedQuizId || quizzes[0]?._id;
    if (!qid) return;
    const composedSearch = [studentCode, fullName].filter(Boolean).join(' ');
    const res = await quizResultAPI.getQuizResults(qid, { page: page + 1, limit: rowsPerPage, search: composedSearch, className, gender, minScore: minScore ? Number(minScore) : undefined, maxScore: maxScore ? Number(maxScore) : undefined });
    const payload = (res.data.data as any);
    const data = payload.results as any[];
    setTotal(payload.pagination?.total ?? data.length);
    const mapped = data.map((r: any) => ({
      id: r._id,
      studentCode: r.studentCode || r.studentId?.studentId || '',
      fullName: r.fullName || r.studentId?.fullName || r.studentId?.username || '',
      className: r.className || r.studentId?.class || '',
      gender: r.gender || r.studentId?.gender || '',
      quizTitle: r.quizId?.title || '',
      score: r.score != null ? Number(r.score).toFixed(2) : '',
      totalQuestions: r.totalQuestions,
      timeSpent: r.timeSpent,
      completedAt: r.completedAt,
    }));
    setRows(mapped);
  };

  const handleExportExcel = async () => {
    if (!selectedQuizId && isTeacher) {
      setError('Vui lòng chọn bài thi để xuất Excel');
      return;
    }

    try {
      setExporting(true);
      setError(null);
      
      // Compose search params (same as loadForTeacher)
      const composedSearch = [studentCode, fullName].filter(Boolean).join(' ');
      const params: any = {
        search: composedSearch || undefined,
        className: className || undefined,
        gender: gender || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        maxScore: maxScore ? Number(maxScore) : undefined
      };
      
      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
      
      const blob = await quizResultAPI.exportQuizResultsToExcel(selectedQuizId, params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const quizTitle = quizzes.find((q: any) => q._id === selectedQuizId)?.title || 'KetQua';
      const filename = `KetQua_${quizTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.xlsx`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError('Không thể xuất file Excel: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (isTeacher) {
          await loadForTeacher();
        } else {
          await loadForStudent();
        }
      } catch (e: any) {
        setError(e.response?.data?.message || 'Không thể tải kết quả');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, selectedQuizId, page, rowsPerPage, className, gender, studentCode, fullName, minScore, maxScore]);

  return (
    <Box sx={{ width: '100%', py: 4 }}>
      <Card sx={{ width: '100%', mx: 0 }}>
        <CardContent sx={{ width: '100%', p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5" fontWeight="bold">Kết quả bài thi</Typography>
            {isTeacher && selectedQuizId && (
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportExcel}
                disabled={exporting}
                sx={{ minWidth: 150 }}
              >
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>
            )}
          </Box>

          {/* Mandatory quiz selector (dropdown) */}
          {(isTeacher || (!isTeacher && quizzes.length > 0)) && (
            <Autocomplete
              options={quizzes}
              getOptionLabel={(o: any) => o.title || ''}
              value={quizzes.find((q: any) => q._id === selectedQuizId) || null}
              onChange={(e, val) => { setSelectedQuizId(val?._id || ''); setPage(0); }}
              renderInput={(params) => <TextField {...params} label="Bài thi" size="small" sx={{ mb: 2, minWidth: 300 }} />}
            />
          )}

          {/* Filters row */}
          {((isTeacher && selectedQuizId) || (!isTeacher)) && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
              {isTeacher && (
                <>
                  <TextField size="small" label="MSSV" value={studentCode} onChange={(e) => { setStudentCode(e.target.value); setPage(0); }} />
                  <TextField size="small" label="Họ tên" value={fullName} onChange={(e) => { setFullName(e.target.value); setPage(0); }} />
                  <TextField size="small" label="Lớp" value={className} onChange={(e) => { setClassName(e.target.value); setPage(0); }} />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="gender-filter-label">Giới tính</InputLabel>
                    <Select labelId="gender-filter-label" value={gender} label="Giới tính" onChange={(e) => { setGender(String(e.target.value)); setPage(0); }}>
                      <MenuItem value="">Tất cả</MenuItem>
                      <MenuItem value="male">Nam</MenuItem>
                      <MenuItem value="female">Nữ</MenuItem>
                      <MenuItem value="other">Khác</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
              <TextField size="small" type="number" label="Điểm từ" value={minScore} onChange={(e) => { setMinScore(e.target.value); setPage(0); }} sx={{ width: 120 }} />
              <TextField size="small" type="number" label="Đến" value={maxScore} onChange={(e) => { setMaxScore(e.target.value); setPage(0); }} sx={{ width: 120 }} />
            </Stack>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Table size="small" sx={{ width: '100%', minWidth: '100%' }}>
                <TableHead>
                  <TableRow>
                    {columns.map(col => (
                      <TableCell key={col.key}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        <Typography align="center" color="text.secondary">Chưa có kết quả</Typography>
                      </TableCell>
                    </TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.studentCode}</TableCell>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell>{r.className}</TableCell>
                      <TableCell>{r.gender === 'male' ? 'Nam' : r.gender === 'female' ? 'Nữ' : r.gender ? 'Khác' : ''}</TableCell>
                      <TableCell>
                        <Chip label={r.quizTitle} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{r.score}</TableCell>
                      <TableCell>{r.totalQuestions}</TableCell>
                      <TableCell>{formatDuration(r.timeSpent)}</TableCell>
                      <TableCell>{formatDateTime(r.completedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5,10,20,50]}
                />
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Results;


